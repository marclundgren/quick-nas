/**
 * File Validator Plugin
 * 
 * Validates uploaded files based on allowed/blocked file extensions
 */

module.exports = {
    name: 'File Validator',
    version: '1.0.0',
    description: 'Validates file uploads based on extension whitelist/blacklist',

    async init(context) {
        const { registerHook, config } = context;

        // Default configuration
        const allowedExtensions = config.allowedExtensions || [];
        const blockedExtensions = config.blockedExtensions || [];
        const mode = config.mode || 'blacklist'; // 'whitelist' or 'blacklist'

        registerHook('beforeUpload', async (data) => {
            const { files } = data;

            for (const file of files) {
                const ext = file.originalname.split('.').pop().toLowerCase();

                if (mode === 'whitelist' && allowedExtensions.length > 0) {
                    if (!allowedExtensions.includes(ext)) {
                        throw new Error(`File type .${ext} is not allowed. Allowed types: ${allowedExtensions.join(', ')}`);
                    }
                } else if (mode === 'blacklist' && blockedExtensions.length > 0) {
                    if (blockedExtensions.includes(ext)) {
                        throw new Error(`File type .${ext} is blocked`);
                    }
                }
            }

            return data;
        });

        console.log(`    Mode: ${mode}`);
        if (mode === 'whitelist' && allowedExtensions.length > 0) {
            console.log(`    Allowed: ${allowedExtensions.join(', ')}`);
        }
        if (mode === 'blacklist' && blockedExtensions.length > 0) {
            console.log(`    Blocked: ${blockedExtensions.join(', ')}`);
        }
    }
};
