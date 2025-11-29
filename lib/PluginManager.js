const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class PluginManager {
    constructor(pluginsDir = path.join(__dirname, '../plugins')) {
        this.pluginsDir = pluginsDir;
        this.plugins = new Map();
        this.hooks = new Map();
        this.routes = [];
    }

    /**
     * Load all plugins from the plugins directory
     */
    async loadPlugins() {
        try {
            // Ensure plugins directory exists
            if (!fsSync.existsSync(this.pluginsDir)) {
                console.log('📦 No plugins directory found, creating...');
                await fs.mkdir(this.pluginsDir, { recursive: true });
                return;
            }

            const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
            const pluginDirs = entries.filter(entry =>
                entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.')
            );

            console.log(`📦 Loading plugins from ${this.pluginsDir}...`);

            for (const dir of pluginDirs) {
                await this.loadPlugin(dir.name);
            }

            console.log(`✅ Loaded ${this.plugins.size} plugin(s)`);
        } catch (error) {
            console.error('❌ Error loading plugins:', error.message);
        }
    }

    /**
     * Load a single plugin
     */
    async loadPlugin(pluginName) {
        try {
            const pluginPath = path.join(this.pluginsDir, pluginName);
            const indexPath = path.join(pluginPath, 'index.js');

            // Check if index.js exists
            if (!fsSync.existsSync(indexPath)) {
                console.warn(`⚠️  Plugin ${pluginName} has no index.js, skipping`);
                return;
            }

            // Load plugin configuration if exists
            const configPath = path.join(pluginPath, 'config.json');
            let config = {};
            if (fsSync.existsSync(configPath)) {
                const configContent = await fs.readFile(configPath, 'utf8');
                config = JSON.parse(configContent);
            }

            // Check if plugin is disabled
            if (config.enabled === false) {
                console.log(`⏭️  Plugin ${pluginName} is disabled, skipping`);
                return;
            }

            // Load the plugin module
            const plugin = require(indexPath);

            // Validate plugin structure
            if (!this.validatePlugin(plugin, pluginName)) {
                return;
            }

            // Initialize plugin
            const context = {
                registerHook: this.registerHook.bind(this),
                addRoute: this.addRoute.bind(this),
                config,
                pluginDir: pluginPath
            };

            await plugin.init(context);

            // Store plugin info
            this.plugins.set(pluginName, {
                name: plugin.name || pluginName,
                version: plugin.version || '1.0.0',
                description: plugin.description || '',
                module: plugin
            });

            console.log(`  ✓ ${plugin.name || pluginName} v${plugin.version || '1.0.0'}`);
        } catch (error) {
            console.error(`  ✗ Failed to load plugin ${pluginName}:`, error.message);
        }
    }

    /**
     * Validate plugin structure
     */
    validatePlugin(plugin, pluginName) {
        if (typeof plugin.init !== 'function') {
            console.warn(`⚠️  Plugin ${pluginName} missing init() function, skipping`);
            return false;
        }
        return true;
    }

    /**
     * Register a hook callback
     */
    registerHook(hookName, callback) {
        if (!this.hooks.has(hookName)) {
            this.hooks.set(hookName, []);
        }
        this.hooks.get(hookName).push(callback);
    }

    /**
     * Add a custom route
     */
    addRoute(method, path, handler) {
        this.routes.push({ method, path, handler });
    }

    /**
     * Execute all hooks for a given hook point
     * @param {string} hookName - Name of the hook
     * @param {*} data - Data to pass to hooks
     * @returns {Promise<*>} Modified data or original if no hooks
     */
    async executeHook(hookName, data) {
        const callbacks = this.hooks.get(hookName) || [];

        if (callbacks.length === 0) {
            return data;
        }

        let result = data;

        for (const callback of callbacks) {
            try {
                const hookResult = await callback(result);
                // If hook returns a value, use it as the new data
                if (hookResult !== undefined) {
                    result = hookResult;
                }
            } catch (error) {
                console.error(`❌ Error in hook ${hookName}:`, error.message);
                // Continue executing other hooks even if one fails
            }
        }

        return result;
    }

    /**
     * Get information about loaded plugins
     */
    getPluginInfo() {
        return Array.from(this.plugins.values()).map(p => ({
            name: p.name,
            version: p.version,
            description: p.description
        }));
    }

    /**
     * Get all registered routes
     */
    getRoutes() {
        return this.routes;
    }
}

module.exports = PluginManager;
