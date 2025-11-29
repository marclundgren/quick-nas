# Plugin Development Guide

This guide explains how to create plugins for Quick NAS.

## Table of Contents

- [Overview](#overview)
- [Plugin Structure](#plugin-structure)
- [Creating a Plugin](#creating-a-plugin)
- [Available Hooks](#available-hooks)
- [Adding Custom Routes](#adding-custom-routes)
- [Configuration](#configuration)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Overview

Quick NAS plugins are simple Node.js modules that can:
- Hook into file operation lifecycle events
- Add custom API endpoints
- Transform data flowing through the system
- Extend functionality without modifying core code

### Design Principles

- **Simple**: Plugins are just Node.js modules in a folder
- **Isolated**: Plugin errors won't crash the application
- **Optional**: Core functionality works without plugins
- **Discoverable**: Plugins load automatically on startup

## Plugin Structure

A plugin is a directory in `plugins/` containing:

```
plugins/
└── my-plugin/
    ├── index.js      # Required: Plugin code
    ├── config.json   # Optional: Configuration
    └── package.json  # Optional: Plugin dependencies
```

### Minimal Plugin

```javascript
// plugins/my-plugin/index.js
module.exports = {
  name: 'My Plugin',
  version: '1.0.0',
  description: 'What this plugin does',

  async init(context) {
    // Plugin initialization code
  }
};
```

## Creating a Plugin

### Step 1: Copy the Template

```bash
cp -r plugins/_template plugins/my-plugin
cd plugins/my-plugin
```

### Step 2: Edit index.js

```javascript
module.exports = {
  name: 'My Plugin',
  version: '1.0.0',
  description: 'My awesome plugin',

  async init(context) {
    const { registerHook, addRoute, config, pluginDir } = context;

    // Register hooks here
    registerHook('afterUpload', async (data) => {
      console.log('File uploaded:', data.files);
    });
  }
};
```

### Step 3: Configure (Optional)

```json
// config.json
{
  "enabled": true,
  "mySetting": "value"
}
```

### Step 4: Restart the Server

```bash
docker-compose restart
```

Check logs to see if your plugin loaded:
```bash
docker logs quick-nas
```

## Available Hooks

### beforeUpload

Called before files are saved to disk.

**Use cases**: Validation, virus scanning, size limits

**Data**:
```javascript
{
  files: [
    {
      fieldname: 'files',
      originalname: 'photo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 12345,
      // ... other multer fields
    }
  ],
  req: Request  // Express request object
}
```

**Return**: Modified data or throw error to reject upload

**Example**:
```javascript
registerHook('beforeUpload', async (data) => {
  for (const file of data.files) {
    if (file.size > 100 * 1024 * 1024) {
      throw new Error('File too large (max 100MB)');
    }
  }
  return data;
});
```

---

### afterUpload

Called after files are saved to disk.

**Use cases**: Thumbnail generation, indexing, notifications

**Data**:
```javascript
{
  files: [
    {
      name: 'photo.jpg',
      size: 12345,
      path: '/data/photo.jpg'
    }
  ],
  req: Request
}
```

**Return**: Optional (data not used)

**Example**:
```javascript
registerHook('afterUpload', async (data) => {
  for (const file of data.files) {
    console.log(`New file: ${file.name} (${file.size} bytes)`);
    // Generate thumbnail, send notification, etc.
  }
});
```

---

### beforeDownload

Called before a file is sent to the client.

**Use cases**: Access control, logging, rate limiting

**Data**:
```javascript
{
  filename: 'photo.jpg',
  filePath: '/data/photo.jpg',
  req: Request
}
```

**Return**: Modified data or throw error to reject download

**Example**:
```javascript
registerHook('beforeDownload', async (data) => {
  // Check if user has permission
  if (!hasPermission(data.req.user, data.filename)) {
    throw new Error('Access denied');
  }
  return data;
});
```

---

### afterDownload

Called after a file is sent to the client.

**Use cases**: Analytics, audit logging

**Data**:
```javascript
{
  filename: 'photo.jpg',
  req: Request
}
```

**Return**: Optional

**Example**:
```javascript
registerHook('afterDownload', async (data) => {
  await logDownload(data.filename, data.req.ip);
});
```

---

### beforeDelete

Called before a file is deleted.

**Use cases**: Backup, access control, confirmation

**Data**:
```javascript
{
  filename: 'photo.jpg',
  filePath: '/data/photo.jpg',
  req: Request
}
```

**Return**: Modified data or throw error to reject deletion

**Example**:
```javascript
registerHook('beforeDelete', async (data) => {
  // Create backup before deletion
  await fs.copyFile(data.filePath, `/backups/${data.filename}`);
  return data;
});
```

---

### afterDelete

Called after a file is deleted.

**Use cases**: Cleanup, logging, notifications

**Data**:
```javascript
{
  filename: 'photo.jpg',
  req: Request
}
```

**Return**: Optional

**Example**:
```javascript
registerHook('afterDelete', async (data) => {
  // Clean up related files
  await cleanupThumbnails(data.filename);
});
```

---

### transformFileList

Called when listing files, allows modifying the file list.

**Use cases**: Add metadata, filter files, add virtual files

**Data**:
```javascript
{
  files: [
    {
      name: 'photo.jpg',
      size: 12345,
      modified: Date,
      isDirectory: false
    }
  ],
  req: Request
}
```

**Return**: Object with modified `files` array

**Example**:
```javascript
registerHook('transformFileList', async (data) => {
  // Add custom metadata
  const filesWithMeta = data.files.map(file => ({
    ...file,
    thumbnail: `/api/thumbnail/${file.name}`
  }));
  
  return { files: filesWithMeta };
});
```

## Adding Custom Routes

Plugins can add custom Express routes:

```javascript
addRoute('GET', '/api/myplugin/stats', async (req, res) => {
  res.json({ totalFiles: 42 });
});

addRoute('POST', '/api/myplugin/process', async (req, res) => {
  const result = await processData(req.body);
  res.json(result);
});
```

**Available methods**: GET, POST, PUT, DELETE, PATCH

## Configuration

### Plugin Configuration

Create `config.json` in your plugin directory:

```json
{
  "enabled": true,
  "apiKey": "your-key",
  "maxSize": 1048576,
  "allowedTypes": ["jpg", "png"]
}
```

Access in your plugin:

```javascript
async init(context) {
  const { config } = context;
  
  console.log('API Key:', config.apiKey);
  console.log('Max Size:', config.maxSize);
}
```

### Disabling Plugins

Set `enabled: false` in `config.json`:

```json
{
  "enabled": false
}
```

## Best Practices

### 1. Error Handling

Always wrap risky operations in try-catch:

```javascript
registerHook('afterUpload', async (data) => {
  try {
    await riskyOperation(data.files);
  } catch (error) {
    console.error('Plugin error:', error);
    // Don't throw - let other plugins continue
  }
});
```

### 2. Async Operations

Use async/await for all I/O operations:

```javascript
registerHook('afterUpload', async (data) => {
  await fs.writeFile('log.txt', 'Upload complete\n', { flag: 'a' });
});
```

### 3. Don't Block

Avoid long-running synchronous operations:

```javascript
// ❌ Bad - blocks the server
registerHook('afterUpload', async (data) => {
  for (let i = 0; i < 1000000000; i++) {
    // Heavy computation
  }
});

// ✅ Good - offload to worker or make async
registerHook('afterUpload', async (data) => {
  // Queue job for background processing
  await jobQueue.add('process-file', data);
});
```

### 4. Clean Up Resources

Clean up resources when done:

```javascript
let connection;

async init(context) {
  connection = await database.connect();
  
  registerHook('afterUpload', async (data) => {
    await connection.query('INSERT INTO uploads ...');
  });
}
```

### 5. Use Plugin Directory

Store plugin files in the plugin directory:

```javascript
async init(context) {
  const { pluginDir } = context;
  const dataFile = path.join(pluginDir, 'data.json');
  
  await fs.writeFile(dataFile, JSON.stringify(data));
}
```

### 6. Validate Input

Always validate data from hooks:

```javascript
registerHook('beforeUpload', async (data) => {
  if (!data.files || !Array.isArray(data.files)) {
    throw new Error('Invalid upload data');
  }
  
  for (const file of data.files) {
    if (!file.originalname) {
      throw new Error('File missing name');
    }
  }
  
  return data;
});
```

## Examples

### Example 1: File Size Limiter

```javascript
module.exports = {
  name: 'Size Limiter',
  version: '1.0.0',
  
  async init(context) {
    const { registerHook, config } = context;
    const maxSize = config.maxSize || 10 * 1024 * 1024; // 10MB default
    
    registerHook('beforeUpload', async (data) => {
      for (const file of data.files) {
        if (file.size > maxSize) {
          throw new Error(`File ${file.originalname} exceeds ${maxSize} bytes`);
        }
      }
      return data;
    });
  }
};
```

### Example 2: Upload Notifier

```javascript
const nodemailer = require('nodemailer');

module.exports = {
  name: 'Upload Notifier',
  version: '1.0.0',
  
  async init(context) {
    const { registerHook, config } = context;
    
    const transporter = nodemailer.createTransport(config.smtp);
    
    registerHook('afterUpload', async (data) => {
      const fileList = data.files.map(f => f.name).join(', ');
      
      await transporter.sendMail({
        to: config.notifyEmail,
        subject: 'New files uploaded',
        text: `Files uploaded: ${fileList}`
      });
    });
  }
};
```

### Example 3: Metadata Extractor

```javascript
const exifParser = require('exif-parser');
const fs = require('fs').promises;

module.exports = {
  name: 'Metadata Extractor',
  version: '1.0.0',
  
  async init(context) {
    const { registerHook } = context;
    
    registerHook('transformFileList', async (data) => {
      const filesWithMeta = await Promise.all(
        data.files.map(async (file) => {
          if (file.name.match(/\.(jpg|jpeg)$/i)) {
            try {
              const buffer = await fs.readFile(file.path);
              const parser = exifParser.create(buffer);
              const result = parser.parse();
              
              return {
                ...file,
                metadata: {
                  camera: result.tags.Model,
                  dateTaken: result.tags.DateTimeOriginal
                }
              };
            } catch (error) {
              return file;
            }
          }
          return file;
        })
      );
      
      return { files: filesWithMeta };
    });
  }
};
```

## Troubleshooting

### Plugin Not Loading

1. Check plugin directory name doesn't start with `_` or `.`
2. Verify `index.js` exists
3. Check for syntax errors: `node plugins/my-plugin/index.js`
4. Look at server logs: `docker logs quick-nas`

### Plugin Errors

1. Check server logs for error messages
2. Add console.log statements to debug
3. Verify hook names are correct
4. Ensure async functions use await

### Configuration Not Working

1. Verify `config.json` is valid JSON
2. Check file permissions
3. Restart server after config changes

### Hooks Not Firing

1. Verify hook name is correct (case-sensitive)
2. Check if plugin is enabled in config
3. Ensure hook is registered in `init()`
4. Test with console.log to verify execution

## Getting Help

- Check existing plugins in `plugins/` for examples
- Review the plugin template in `plugins/_template/`
- Look at the PluginManager source in `lib/PluginManager.js`

---

Happy plugin development! 🚀
