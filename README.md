# Quick NAS

A simple, beautiful, and containerized file sharing system for quick and easy file storage and retrieval.

![Quick NAS](https://img.shields.io/badge/Docker-Ready-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone or download this repository**

2. **Edit `docker-compose.yml`** to set your storage path:
   ```yaml
   volumes:
     - /path/to/your/files:/data  # Change the left side to your desired path
   ```

3. **Start the application**:
   ```bash
   docker-compose up -d
   ```

4. **Access the web interface**:
   Open your browser to `http://localhost:3000`

### Using Docker

```bash
# Build the image
docker build -t quick-nas .

# Run the container
docker run -d \
  --name quick-nas \
  -p 3000:3000 \
  -v /path/to/your/files:/data \
  quick-nas
```

## Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)
- `UPLOAD_DIR` - Directory for file storage (default: /data)

### Volume Mounting

The application stores files in `/data` inside the container. Mount this to your host system:

```yaml
volumes:
  - /your/host/path:/data
```

**Examples:**
- macOS: `- /Users/yourname/NAS:/data`
- Linux: `- /home/yourname/nas:/data`
- Windows: `- C:\Users\yourname\NAS:/data`

### Port Configuration

To use a different port, edit `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"  # Access on port 8080
```

## Usage

### Uploading Files

1. **Drag & Drop**: Drag files onto the upload zone
2. **File Picker**: Click the upload zone to browse and select files
3. **Multiple Files**: Upload multiple files at once

### Downloading Files

Click the **Download** button on any file card

### Deleting Files

Click the **Delete** button (trash icon) and confirm

### Refreshing the File List

Click the **Refresh** button in the "Your Files" section

## Development

### Prerequisites

- Node.js 18+
- npm

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create data directory**:
   ```bash
   mkdir data
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Access the application**:
   Open `http://localhost:3000`

## File Size Limits

The default maximum file size is **10GB**. To change this, edit `server.js`:

```javascript
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024 // Change this value
  }
});
```

## Plugin System

Quick NAS includes an extensible plugin system that allows you to add custom functionality without modifying core code.

### Included Plugins

**File Validator** - Validates file uploads based on extension whitelist/blacklist  
**Audit Logger** - Logs all file operations to an audit trail

### Using Plugins

Plugins are automatically loaded from the `plugins/` directory on startup. To enable/disable a plugin, edit its `config.json`:

```json
{
  "enabled": true
}
```

### Available Hooks

Plugins can hook into these lifecycle events:

- `beforeUpload` - Validate or reject uploads
- `afterUpload` - Process uploaded files (thumbnails, indexing, etc.)
- `beforeDownload` - Access control, logging
- `afterDownload` - Analytics, audit trails
- `beforeDelete` - Validation, backups
- `afterDelete` - Cleanup, logging
- `transformFileList` - Add metadata to file listings

### Creating Plugins

1. **Copy the template**:
   ```bash
   cp -r plugins/_template plugins/my-plugin
   ```

2. **Edit `plugins/my-plugin/index.js`**:
   ```javascript
   module.exports = {
     name: 'My Plugin',
     version: '1.0.0',
     
     async init(context) {
       context.registerHook('afterUpload', async (data) => {
         console.log('File uploaded:', data.files);
       });
     }
   };
   ```

3. **Restart the server**:
   ```bash
   docker-compose restart
   ```

### Plugin Development

See [PLUGIN_DEVELOPMENT.md](PLUGIN_DEVELOPMENT.md) for comprehensive documentation on creating plugins.

### Plugin API Endpoint

View loaded plugins at: `http://localhost:3000/api/plugins`

## Troubleshooting

### Container won't start

- Check if port 3000 is already in use
- Verify the volume path exists and has proper permissions

### Files not persisting

- Ensure the volume is properly mounted in `docker-compose.yml`
- Check directory permissions on the host

### Upload fails

- Check available disk space
- Verify file size is within limits
- Check browser console for errors

### Can't access from other devices

- Ensure port 3000 is open in your firewall
- Use your server's IP address instead of localhost

## Security Notes

⚠️ **Important**: This is a simple file sharing system designed for personal use on trusted networks.

For production use, consider:
- Adding authentication
- Using HTTPS
- Implementing rate limiting
- Adding virus scanning
- Setting up proper access controls

## Technology Stack

- **Backend**: Node.js, Express
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **File Handling**: Multer
- **Container**: Docker

## License

MIT License - feel free to use and modify as needed!

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

---

Made with ❤️ for simple file sharing
