/**
 * Audit Logger Plugin
 * 
 * Logs all file operations to an audit log file
 */

const fs = require('fs').promises;
const path = require('path');

module.exports = {
    name: 'Audit Logger',
    version: '1.0.0',
    description: 'Logs all file operations for audit trail',

    async init(context) {
        const { registerHook, config, pluginDir } = context;

        const logFile = config.logFile || path.join(process.env.UPLOAD_DIR || '/data', 'audit.log');

        async function log(action, filename, details = {}) {
            const timestamp = new Date().toISOString();
            const logEntry = JSON.stringify({
                timestamp,
                action,
                filename,
                ...details
            });

            try {
                await fs.appendFile(logFile, logEntry + '\n');
            } catch (error) {
                console.error('Audit log error:', error.message);
            }
        }

        // Register hooks for all file operations
        registerHook('afterUpload', async (data) => {
            for (const file of data.files) {
                await log('upload', file.name, { size: file.size });
            }
            return data;
        });

        registerHook('afterDownload', async (data) => {
            await log('download', data.filename);
            return data;
        });

        registerHook('afterDelete', async (data) => {
            await log('delete', data.filename);
            return data;
        });

        console.log(`    Log file: ${logFile}`);
    }
};
