/**
 * Base Plugin Interface
 * 
 * This is a reference implementation showing the structure of a Quick NAS plugin.
 * Plugins should export an object with these properties and methods.
 */

class Plugin {
    /**
     * Plugin metadata
     */
    static name = 'example-plugin';
    static version = '1.0.0';
    static description = 'An example plugin';

    /**
     * Initialize the plugin
     * @param {Object} context - Plugin context
     * @param {Function} context.registerHook - Register a hook callback
     * @param {Function} context.addRoute - Add a custom Express route
     * @param {Object} context.config - Plugin configuration from config.json
     * @param {string} context.pluginDir - Absolute path to plugin directory
     */
    static async init(context) {
        // Register hooks
        // context.registerHook('beforeUpload', async (data) => { ... });
        // context.registerHook('afterUpload', async (data) => { ... });

        // Add custom routes
        // context.addRoute('GET', '/api/custom', async (req, res) => { ... });
    }
}

/**
 * Available Hook Points:
 * 
 * - beforeUpload: Called before file is saved
 *   Data: { files: Array<File>, req: Request }
 *   Return: Modified data or throw error to reject upload
 * 
 * - afterUpload: Called after file is saved
 *   Data: { files: Array<{name, size, path}>, req: Request }
 *   Return: void or modified data
 * 
 * - beforeDownload: Called before file is sent
 *   Data: { filename: string, filePath: string, req: Request }
 *   Return: Modified data or throw error to reject download
 * 
 * - afterDownload: Called after file is sent
 *   Data: { filename: string, req: Request }
 *   Return: void
 * 
 * - beforeDelete: Called before file is deleted
 *   Data: { filename: string, filePath: string, req: Request }
 *   Return: Modified data or throw error to reject deletion
 * 
 * - afterDelete: Called after file is deleted
 *   Data: { filename: string, req: Request }
 *   Return: void
 * 
 * - transformFileList: Called when listing files
 *   Data: { files: Array<FileInfo>, req: Request }
 *   Return: Modified files array
 */

module.exports = Plugin;
