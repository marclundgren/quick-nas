# Quick NAS Plugins

This directory contains plugins that extend Quick NAS functionality.

## Installed Plugins

### File Validator
**Status**: Enabled  
**Description**: Validates file uploads based on extension whitelist/blacklist  
**Configuration**: `file-validator/config.json`

### Audit Logger
**Status**: Enabled  
**Description**: Logs all file operations to an audit trail  
**Configuration**: `audit-logger/config.json`

## Adding Plugins

1. Create a new directory in `plugins/`
2. Add an `index.js` file with your plugin code
3. Optionally add a `config.json` for configuration
4. Restart the server to load the plugin

See [PLUGIN_DEVELOPMENT.md](../PLUGIN_DEVELOPMENT.md) for detailed instructions.

## Disabling Plugins

To disable a plugin, set `"enabled": false` in its `config.json` file.

## Plugin Template

Use the `_template` directory as a starting point for new plugins.
