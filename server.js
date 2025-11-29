const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const PluginManager = require('./lib/PluginManager');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data';

// Initialize plugin manager
const pluginManager = new PluginManager();

// Ensure upload directory exists
if (!fsSync.existsSync(UPLOAD_DIR)) {
  fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Use original filename
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024 // 10GB max file size
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Helper: Validate and sanitize path
function validatePath(userPath) {
  if (!userPath || userPath === '/') {
    return UPLOAD_DIR;
  }

  // Remove leading/trailing slashes and normalize
  const cleaned = userPath.replace(/^\/+|\/+$/g, '');

  // Prevent path traversal
  if (cleaned.includes('..') || path.isAbsolute(cleaned)) {
    throw new Error('Invalid path');
  }

  // Resolve full path
  const fullPath = path.join(UPLOAD_DIR, cleaned);

  // Ensure it's within UPLOAD_DIR
  if (!fullPath.startsWith(UPLOAD_DIR)) {
    throw new Error('Path outside storage directory');
  }

  return fullPath;
}

// Helper: Get folder metadata
async function getFolderMetadata(folderPath) {
  const items = await fs.readdir(folderPath);
  let totalSize = 0;
  let itemCount = 0;

  for (const item of items) {
    const itemPath = path.join(folderPath, item);
    const stats = await fs.stat(itemPath);
    itemCount++;

    if (stats.isDirectory()) {
      // Recursively get folder size (simplified - just direct children)
      const subItems = await fs.readdir(itemPath);
      for (const subItem of subItems) {
        const subStats = await fs.stat(path.join(itemPath, subItem));
        totalSize += subStats.size;
      }
    } else {
      totalSize += stats.size;
    }
  }

  return { itemCount, totalSize };
}

// API Routes

// Get list of files (with optional path parameter)
app.get('/api/files', async (req, res) => {
  try {
    const requestedPath = req.query.path || '/';
    const fullPath = validatePath(requestedPath);

    // Check if directory exists
    const dirStats = await fs.stat(fullPath);
    if (!dirStats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }

    const items = await fs.readdir(fullPath);
    const itemDetails = await Promise.all(
      items.map(async (itemName) => {
        const itemPath = path.join(fullPath, itemName);
        const stats = await fs.stat(itemPath);

        // Build relative path from UPLOAD_DIR
        const relativePath = path.relative(UPLOAD_DIR, itemPath);
        const normalizedPath = '/' + relativePath.replace(/\\/g, '/');

        const baseInfo = {
          name: itemName,
          path: normalizedPath,
          size: stats.size,
          modified: stats.mtime,
          isDirectory: stats.isDirectory()
        };

        // Add folder-specific metadata
        if (stats.isDirectory()) {
          try {
            const metadata = await getFolderMetadata(itemPath);
            baseInfo.itemCount = metadata.itemCount;
            baseInfo.size = metadata.totalSize;
          } catch (error) {
            console.error(`Error getting metadata for ${itemName}:`, error);
            baseInfo.itemCount = 0;
          }
        }

        return baseInfo;
      })
    );

    // Plugin hook: transform file list
    const hookResult = await pluginManager.executeHook('transformFileList', {
      files: itemDetails,
      path: requestedPath,
      req
    });

    res.json(hookResult.files || itemDetails);
  } catch (error) {
    console.error('Error reading files:', error);
    if (error.message.includes('Invalid path') || error.message.includes('Path outside')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to read files' });
    }
  }
});

// Upload file(s) with dynamic destination
app.post('/api/upload', async (req, res) => {
  try {
    // Get and validate destination path
    const requestedPath = req.query.path || '/';
    const destPath = validatePath(requestedPath);

    // Ensure destination directory exists
    await fs.mkdir(destPath, { recursive: true });

    // Configure multer for this request
    const dynamicUpload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, destPath);
        },
        filename: (req, file, cb) => {
          cb(null, file.originalname);
        }
      }),
      limits: {
        fileSize: 10 * 1024 * 1024 * 1024 // 10GB max file size
      }
    }).array('files');

    // Process upload
    dynamicUpload(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ error: 'Upload failed: ' + err.message });
      }
      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ error: 'No files uploaded' });
        }

        // Plugin hook: before upload
        try {
          await pluginManager.executeHook('beforeUpload', {
            files: req.files,
            path: requestedPath,
            req
          });
        } catch (error) {
          // Plugin rejected the upload
          // Clean up uploaded files
          for (const file of req.files) {
            try {
              await fs.unlink(file.path);
            } catch (e) {
              console.error('Error cleaning up file:', e);
            }
          }
          return res.status(400).json({ error: error.message || 'Upload rejected by plugin' });
        }

        const uploadedFiles = req.files.map(file => ({
          name: file.filename,
          size: file.size,
          path: file.path
        }));

        // Plugin hook: after upload
        await pluginManager.executeHook('afterUpload', {
          files: uploadedFiles,
          path: requestedPath,
          req
        });

        res.json({
          message: 'Files uploaded successfully',
          files: uploadedFiles.map(f => ({ name: f.name, size: f.size }))
        });
      } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ error: 'Failed to upload files' });
      }
    });
  } catch (error) {
    console.error('Upload setup error:', error);
    if (error.message.includes('Invalid path') || error.message.includes('Path outside')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Upload failed' });
    }
  }
});

// Create folder
app.post('/api/folders', async (req, res) => {
  try {
    const { path: folderPath, name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    // Validate folder name
    if (name.includes('/') || name.includes('\\') || name === '.' || name === '..') {
      return res.status(400).json({ error: 'Invalid folder name' });
    }

    // Validate and get parent path
    const parentPath = validatePath(folderPath || '/');
    const newFolderPath = path.join(parentPath, name);

    // Check if folder already exists
    try {
      await fs.access(newFolderPath);
      return res.status(409).json({ error: 'Folder already exists' });
    } catch {
      // Folder doesn't exist, continue
    }

    // Create folder
    await fs.mkdir(newFolderPath, { recursive: false });

    res.json({
      success: true,
      path: path.relative(UPLOAD_DIR, newFolderPath),
      name
    });
  } catch (error) {
    console.error('Create folder error:', error);
    if (error.message.includes('Invalid path')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create folder' });
    }
  }
});

// Delete folder
app.delete('/api/folders/*', async (req, res) => {
  try {
    const folderPath = req.params[0]; // Get everything after /api/folders/

    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required' });
    }

    const fullPath = validatePath(folderPath);

    // Check if folder exists
    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: 'Path is not a folder' });
      }
    } catch {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Delete folder recursively
    await fs.rm(fullPath, { recursive: true, force: true });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete folder error:', error);
    if (error.message.includes('Invalid path')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete folder' });
    }
  }
});

// Rename folder
app.put('/api/folders/*', async (req, res) => {
  try {
    const folderPath = req.params[0];
    const { newName } = req.body;

    if (!newName || typeof newName !== 'string') {
      return res.status(400).json({ error: 'New folder name is required' });
    }

    // Validate new folder name
    if (newName.includes('/') || newName.includes('\\') || newName === '.' || newName === '..') {
      return res.status(400).json({ error: 'Invalid folder name' });
    }

    const oldPath = validatePath(folderPath);
    const parentDir = path.dirname(oldPath);
    const newPath = path.join(parentDir, newName);

    // Check if old folder exists
    try {
      const stats = await fs.stat(oldPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: 'Path is not a folder' });
      }
    } catch {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Check if new name already exists
    try {
      await fs.access(newPath);
      return res.status(409).json({ error: 'A folder with that name already exists' });
    } catch {
      // New name doesn't exist, continue
    }

    // Rename folder
    await fs.rename(oldPath, newPath);

    res.json({
      success: true,
      newPath: path.relative(UPLOAD_DIR, newPath)
    });
  } catch (error) {
    console.error('Rename folder error:', error);
    if (error.message.includes('Invalid path')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to rename folder' });
    }
  }
});

// Download file
app.get('/api/download/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    // Plugin hook: before download
    try {
      await pluginManager.executeHook('beforeDownload', {
        filename,
        filePath,
        req
      });
    } catch (error) {
      return res.status(403).json({ error: error.message || 'Download rejected by plugin' });
    }

    res.download(filePath, filename, async (err) => {
      if (!err) {
        // Plugin hook: after download
        await pluginManager.executeHook('afterDownload', {
          filename,
          req
        });
      }
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Delete file
app.delete('/api/files/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    // Plugin hook: before delete
    try {
      await pluginManager.executeHook('beforeDelete', {
        filename,
        filePath,
        req
      });
    } catch (error) {
      return res.status(403).json({ error: error.message || 'Deletion rejected by plugin' });
    }

    await fs.unlink(filePath);

    // Plugin hook: after delete
    await pluginManager.executeHook('afterDelete', {
      filename,
      req
    });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Plugin info endpoint
app.get('/api/plugins', (req, res) => {
  res.json({
    plugins: pluginManager.getPluginInfo()
  });
});

// Initialize and start server
async function start() {
  // Load plugins
  await pluginManager.loadPlugins();

  // Register plugin routes
  const pluginRoutes = pluginManager.getRoutes();
  for (const route of pluginRoutes) {
    const method = route.method.toLowerCase();
    if (typeof app[method] === 'function') {
      app[method](route.path, route.handler);
      console.log(`  → Registered route: ${route.method} ${route.path}`);
    }
  }

  // Start server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Quick NAS server running on port ${PORT}`);
    console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
  });
}

start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
