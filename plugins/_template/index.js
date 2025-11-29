/**
 * Plugin Template
 * 
 * Copy this directory to create a new plugin.
 * Rename the directory and customize this file.
 */

module.exports = {
    // Plugin metadata
    name: 'My Plugin',
    version: '1.0.0',
    description: 'Description of what this plugin does',

    /**
     * Initialize the plugin
     * @param {Object} context - Plugin context
     * @param {Function} context.registerHook - Register a hook callback
     * @param {Function} context.addRoute - Add a custom Express route
     * @param {Object} context.config - Plugin configuration from config.json
     * @param {string} context.pluginDir - Absolute path to plugin directory
     */
    async init(context) {
        const { registerHook, addRoute, config, pluginDir } = context;

        // Example: Register a beforeUpload hook
        // registerHook('beforeUpload', async (data) => {
        //   const { files, req } = data;
        //   // Validate or transform files
        //   // Throw error to reject upload
        //   // Return data to continue
        //   return data;
        // });

        // Example: Register an afterUpload hook
        // registerHook('afterUpload', async (data) => {
        //   const { files, req } = data;
        //   // Process uploaded files
        //   // No need to return anything
        // });

        // Example: Register a beforeDownload hook
        // registerHook('beforeDownload', async (data) => {
        //   const { filename, filePath, req } = data;
        //   // Check permissions, log access, etc.
        //   // Throw error to reject download
        //   return data;
        // });

        // Example: Register an afterDownload hook
        // registerHook('afterDownload', async (data) => {
        //   const { filename, req } = data;
        //   // Log download, update stats, etc.
        // });

        // Example: Register a beforeDelete hook
        // registerHook('beforeDelete', async (data) => {
        //   const { filename, filePath, req } = data;
        //   // Check permissions, create backup, etc.
        //   // Throw error to reject deletion
        //   return data;
        // });

        // Example: Register an afterDelete hook
        // registerHook('afterDelete', async (data) => {
        //   const { filename, req } = data;
        //   // Clean up related files, log deletion, etc.
        // });

        // Example: Transform file list
        // registerHook('transformFileList', async (data) => {
        //   const { files, req } = data;
        //   // Add metadata, filter files, etc.
        //   return { files: files.map(f => ({ ...f, customField: 'value' })) };
        // });

        // Example: Add a custom API route
        // addRoute('GET', '/api/myplugin/status', async (req, res) => {
        //   res.json({ status: 'ok' });
        // });

        console.log('    Plugin initialized with config:', config);
    }
};
