// API Base URL
const API_BASE = '';

// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const filesGrid = document.getElementById('filesGrid');
const emptyState = document.getElementById('emptyState');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const refreshBtn = document.getElementById('refreshBtn');

// Folder Navigation State
let currentPath = '/';
let breadcrumbs = [{ name: 'Home', path: '/' }];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load path from URL
    const params = new URLSearchParams(window.location.search);
    currentPath = params.get('path') || '/';
    breadcrumbs = buildBreadcrumbs(currentPath);

    initializeTheme();
    renderBreadcrumbs();
    loadFiles();
    setupEventListeners();

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
        const params = new URLSearchParams(window.location.search);
        currentPath = params.get('path') || '/';
        breadcrumbs = buildBreadcrumbs(currentPath);
        renderBreadcrumbs();
        loadFiles();
    });
});

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    // Set up theme button listeners
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            applyTheme(theme);
            localStorage.setItem('theme', theme);
        });
    });
}

function applyTheme(theme) {
    // Remove active class from all buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Add active class to selected button
    const activeBtn = document.querySelector(`[data-theme="${theme}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Apply theme
    if (theme === 'auto') {
        // Use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
}

// Listen for system theme changes when in auto mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'auto') {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
});

// Folder Navigation Functions
function buildBreadcrumbs(path) {
    if (path === '/') {
        return [{ name: 'Home', path: '/' }];
    }

    const parts = path.split('/').filter(p => p);
    const crumbs = [{ name: 'Home', path: '/' }];

    let currentPath = '';
    for (const part of parts) {
        currentPath += '/' + part;
        crumbs.push({ name: part, path: currentPath });
    }

    return crumbs;
}

function renderBreadcrumbs() {
    const container = document.getElementById('breadcrumbPath');
    if (!container) return;

    const html = breadcrumbs.slice(1).map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 2;
        return `
            <span class="breadcrumb-separator">›</span>
            <span class="breadcrumb-item ${isLast ? 'active' : ''}">
                ${isLast ? crumb.name : `<a href="#" onclick="navigateToPath('${crumb.path}'); return false;">${escapeHtml(crumb.name)}</a>`}
            </span>
        `;
    }).join('');

    container.innerHTML = html;
}

function navigateToPath(path) {
    currentPath = path;
    breadcrumbs = buildBreadcrumbs(path);

    // Update URL
    const params = new URLSearchParams();
    if (path !== '/') {
        params.set('path', path);
    }
    const newUrl = params.toString() ? `?${params}` : window.location.pathname;
    window.history.pushState({}, '', newUrl);

    renderBreadcrumbs();
    loadFiles();
}

// Event Listeners
function setupEventListeners() {
    // Upload button
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }

    // New folder button click
    const newFolderBtn = document.getElementById('newFolderBtn');
    if (newFolderBtn) {
        newFolderBtn.addEventListener('click', async () => {
            const folderName = prompt('Enter folder name:');

            if (!folderName) return;

            // Validate folder name
            if (folderName.includes('/') || folderName.includes('\\') || folderName === '.' || folderName === '..') {
                alert('Invalid folder name. Please avoid special characters.');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/api/folders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        path: currentPath,
                        name: folderName
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to create folder');
                }

                // Reload files to show new folder
                loadFiles();
            } catch (error) {
                console.error('Error creating folder:', error);
                alert(error.message || 'Failed to create folder');
            }
        });
    }

    // Click to upload (hero zone)
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            uploadFiles(e.target.files);
        }
    });

    // Drag and drop on upload zone
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');

        if (e.dataTransfer.files.length > 0) {
            uploadFiles(e.dataTransfer.files);
        }
    });

    // Drag and drop on files grid
    filesGrid.addEventListener('dragover', (e) => {
        e.preventDefault();
        filesGrid.classList.add('drag-over');

        // Check if dragging over a folder
        const target = e.target.closest('.folder-card');
        if (target) {
            document.querySelectorAll('.folder-card').forEach(card => {
                card.classList.remove('drag-target');
            });
            target.classList.add('drag-target');
        }
    });

    filesGrid.addEventListener('dragleave', (e) => {
        // Only remove if leaving the grid entirely
        if (e.target === filesGrid) {
            filesGrid.classList.remove('drag-over');
            document.querySelectorAll('.folder-card').forEach(card => {
                card.classList.remove('drag-target');
            });
        }
    });

    filesGrid.addEventListener('drop', (e) => {
        e.preventDefault();
        filesGrid.classList.remove('drag-over');

        // Check if dropped on a folder
        const folderCard = e.target.closest('.folder-card');
        if (folderCard && e.dataTransfer.files.length > 0) {
            // Get folder path from the card
            const folderPath = folderCard.dataset.path;
            uploadFiles(e.dataTransfer.files, folderPath);
            folderCard.classList.remove('drag-target');
        } else if (e.dataTransfer.files.length > 0) {
            // Upload to current directory
            uploadFiles(e.dataTransfer.files);
        }

        document.querySelectorAll('.folder-card').forEach(card => {
            card.classList.remove('drag-target');
        });
    });

    // Refresh button
    refreshBtn.addEventListener('click', () => {
        loadFiles();
    });
}

// Load files from server
async function loadFiles() {
    try {
        filesGrid.innerHTML = '<div class="loading">Loading files...</div>';
        emptyState.style.display = 'none';

        const url = `${API_BASE}/api/files?path=${encodeURIComponent(currentPath)}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to load files');
        }

        const items = await response.json();

        // Sort: folders first, then files, alphabetically
        const sorted = items.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

        // Show/hide hero upload zone based on whether we have files
        const uploadSection = document.querySelector('.upload-section');
        if (sorted.length === 0 && currentPath === '/') {
            // Show hero upload zone only on root with no files
            uploadSection.style.display = 'block';
            filesGrid.innerHTML = '';
            emptyState.style.display = 'block';
        } else {
            // Hide hero upload zone when we have files
            uploadSection.style.display = 'none';

            if (sorted.length === 0) {
                filesGrid.innerHTML = '';
                emptyState.style.display = 'block';
            } else {
                displayFiles(sorted);
                emptyState.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading files:', error);
        filesGrid.innerHTML = '<div class="loading" style="color: var(--danger);">Failed to load files. Please try again.</div>';
    }
}

// Display files in grid
function displayFiles(files) {
    filesGrid.innerHTML = '';

    // Add parent directory item if not in root
    if (currentPath !== '/') {
        const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
        const parentItem = createParentDirectoryCard(parentPath);
        filesGrid.appendChild(parentItem);
    }

    files.forEach(file => {
        const fileCard = createFileCard(file);
        filesGrid.appendChild(fileCard);
    });
}

// Create file card element
function createFileCard(item) {
    // Handle folders differently
    if (item.isDirectory) {
        return createFolderCard(item);
    }

    const card = document.createElement('div');
    card.className = 'file-card';
    card.style.cursor = 'pointer';

    const fileSize = formatFileSize(item.size);
    const fileDate = new Date(item.modified).toLocaleDateString();

    // Check file type
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const textExtensions = ['txt', 'log', 'md', 'json', 'xml', 'csv', 'js', 'css', 'html', 'py', 'java', 'c', 'cpp', 'sh', 'yml', 'yaml', 'conf', 'ini'];
    const ext = item.name.split('.').pop().toLowerCase();
    const isImage = imageExtensions.includes(ext);
    const isText = textExtensions.includes(ext);

    // All files are clickable - show details modal
    card.onclick = () => {
        showFileDetails(item, isImage, isText);
    };

    card.innerHTML = `
    <div class="file-info">
      <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
        <polyline points="13 2 13 9 20 9"></polyline>
      </svg>
      <div class="file-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
      <div class="file-meta">
        <span>${fileSize}</span>
        <span>${fileDate}</span>
      </div>
    </div>
  `;

    return card;
}

// Create folder card element
function createFolderCard(folder) {
    const card = document.createElement('div');
    card.className = 'file-card folder-card';
    card.style.cursor = 'pointer';
    card.dataset.path = folder.path; // Store path for drag-drop targeting
    card.onclick = (e) => {
        // Only navigate if not dragging
        if (!e.target.closest('.drag-target')) {
            navigateToPath(folder.path);
        }
    };

    const folderSize = formatFileSize(folder.size);
    const folderDate = new Date(folder.modified).toLocaleDateString();

    card.innerHTML = `
    <div class="file-info">
      <svg class="file-icon folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
      <div class="file-name" title="${escapeHtml(folder.name)}">${escapeHtml(folder.name)}</div>
      <div class="file-meta">
        <span>${folder.itemCount} item${folder.itemCount !== 1 ? 's' : ''}</span>
        <span>${folderSize}</span>
      </div>
    </div>
  `;

    return card;
}

// Create parent directory card (..)
function createParentDirectoryCard(parentPath) {
    const card = document.createElement('div');
    card.className = 'file-card parent-directory-card';
    card.style.cursor = 'pointer';
    card.onclick = () => navigateToPath(parentPath);

    card.innerHTML = `
    <div class="file-info">
      <svg class="file-icon parent-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7"></path>
      </svg>
      <div class="file-name">..</div>
      <div class="file-meta">
        <span>Parent directory</span>
      </div>
    </div>
  `;

    return card;
}


// Upload files
async function uploadFiles(files, targetPath = null) {
    const formData = new FormData();
    const fileArray = Array.from(files);

    // Create skeleton cards for each file being uploaded
    const skeletonCards = fileArray.map(file => createSkeletonCard(file.name));
    skeletonCards.forEach(card => filesGrid.appendChild(card));

    for (let file of fileArray) {
        formData.append('files', file);
    }

    // Use targetPath if provided, otherwise use currentPath
    const uploadPath = targetPath || currentPath;

    try {
        // Show progress
        uploadProgress.style.display = 'block';
        progressFill.style.width = '0%';
        progressText.textContent = 'Uploading...';

        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressFill.style.width = percentComplete + '%';
                progressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;

                // Update skeleton cards progress
                skeletonCards.forEach(card => {
                    const progressBar = card.querySelector('.skeleton-progress-fill');
                    if (progressBar) {
                        progressBar.style.width = percentComplete + '%';
                    }
                });
            }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                progressText.textContent = 'Upload complete!';

                // Remove skeleton cards
                skeletonCards.forEach(card => {
                    card.classList.add('skeleton-complete');
                    setTimeout(() => card.remove(), 300);
                });

                setTimeout(() => {
                    uploadProgress.style.display = 'none';
                    fileInput.value = ''; // Reset file input
                    loadFiles(); // Reload file list
                }, 1000);
            } else {
                progressText.textContent = 'Upload failed. Please try again.';
                progressText.style.color = 'var(--danger)';

                // Remove skeleton cards on error
                skeletonCards.forEach(card => card.remove());
            }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
            progressText.textContent = 'Upload failed. Please try again.';
            progressText.style.color = 'var(--danger)';

            // Remove skeleton cards on error
            skeletonCards.forEach(card => card.remove());
        });

        // Send request
        const url = `${API_BASE}/api/upload?path=${encodeURIComponent(uploadPath)}`;
        xhr.open('POST', url);
        xhr.send(formData);

    } catch (error) {
        console.error('Error uploading files:', error);
        progressText.textContent = 'Upload failed. Please try again.';
        progressText.style.color = 'var(--danger)';

        // Remove skeleton cards on error
        skeletonCards.forEach(card => card.remove());
    }
}

// Create skeleton card for uploading file
function createSkeletonCard(filename) {
    const card = document.createElement('div');
    card.className = 'file-card skeleton-card';

    card.innerHTML = `
        <div class="file-info">
            <div class="skeleton-icon"></div>
            <div class="file-name skeleton-text">${escapeHtml(filename)}</div>
            <div class="file-meta">
                <span class="skeleton-text-small">Uploading...</span>
            </div>
        </div>
        <div class="skeleton-progress">
            <div class="skeleton-progress-fill"></div>
        </div>
    `;

    return card;
}

// Download file
function downloadFile(filename) {
    window.location.href = `${API_BASE}/api/download/${encodeURIComponent(filename)}`;
}

// Show file details modal with preview and actions
async function showFileDetails(item, isImage, isText) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';

    let previewHtml = '';

    if (isImage) {
        // Image preview
        previewHtml = `
            <img src="${API_BASE}/api/download/${encodeURIComponent(item.name)}" alt="${escapeHtml(item.name)}" />
        `;
    } else if (isText) {
        // Text preview
        try {
            const response = await fetch(`${API_BASE}/api/download/${encodeURIComponent(item.name)}`);
            if (response.ok) {
                const text = await response.text();
                previewHtml = `
                    <div class="text-preview">
                        <pre><code>${escapeHtml(text)}</code></pre>
                    </div>
                `;
            } else {
                previewHtml = '<div class="no-preview">Failed to load preview</div>';
            }
        } catch (error) {
            console.error('Error loading text file:', error);
            previewHtml = '<div class="no-preview">Failed to load preview</div>';
        }
    } else {
        // No preview available
        previewHtml = `
            <div class="no-preview">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <p>No preview available</p>
            </div>
        `;
    }

    // Get file extension and type
    const ext = item.name.split('.').pop().toLowerCase();
    const fileType = ext.toUpperCase();

    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeFileModal()"></div>
        <div class="modal-content ${isImage ? '' : 'modal-text'}">
            <button class="modal-close" onclick="closeFileModal()" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            
            ${previewHtml}
            
            <div class="modal-file-info">
                <div class="modal-filename">${escapeHtml(item.name)}</div>
                <div class="modal-file-meta">
                    <span class="file-type-badge">${fileType}</span>
                    <span>${formatFileSize(item.size)}</span>
                    <span>${new Date(item.modified).toLocaleDateString()}</span>
                </div>
            </div>
            
            <div class="modal-actions">
                <button class="modal-action-btn download-btn" onclick="downloadFile('${escapeHtml(item.name)}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download
                </button>
                ${isImage || isText ? '' : `
                <button class="modal-action-btn rename-btn" onclick="renameItem('${escapeHtml(item.name)}', ${isImage || isText}); closeFileModal();">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Rename
                </button>
                `}
                <button class="modal-action-btn delete-btn" onclick="deleteFile('${escapeHtml(item.name)}'); closeFileModal();">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    setTimeout(() => modal.classList.add('active'), 10);

    // Handle escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeFileModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Close file modal
function closeFileModal() {
    const modal = document.querySelector('.image-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

// Legacy function for backwards compatibility
function viewFile(filename, fileType) {
    // Find the file item to get full details
    // For now, create a minimal item object
    const item = {
        name: filename,
        size: 0,
        modified: new Date()
    };
    showFileDetails(item, fileType === 'image', fileType === 'text');
}

// Close image modal (legacy)
function closeImageModal() {
    closeFileModal();
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeImageModal();
    }
});

// Delete file or folder
async function deleteFile(filename) {
    // Find the item to check if it's a folder
    const response = await fetch(`${API_BASE}/api/files?path=${encodeURIComponent(currentPath)}`);
    const items = await response.json();
    const item = items.find(i => i.name === filename);

    const isFolder = item && item.isDirectory;
    const itemType = isFolder ? 'folder' : 'file';
    const confirmMessage = isFolder && item.itemCount > 0
        ? `Delete folder "${filename}" and all ${item.itemCount} items inside?`
        : `Delete this ${itemType}?`;

    if (!confirm(confirmMessage)) return;

    try {
        let deleteResponse;

        if (isFolder) {
            // Delete folder
            const folderPath = currentPath === '/' ? filename : `${currentPath}/${filename}`;
            deleteResponse = await fetch(`${API_BASE}/api/folders/${encodeURIComponent(folderPath)}`, {
                method: 'DELETE'
            });
        } else {
            // Delete file
            deleteResponse = await fetch(`${API_BASE}/api/delete/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });
        }

        if (deleteResponse.ok) {
            loadFiles();
        } else {
            const error = await deleteResponse.json();
            alert(error.error || `Failed to delete ${itemType}`);
        }
    } catch (error) {
        console.error(`Error deleting ${itemType}:`, error);
        alert(`Failed to delete ${itemType}`);
    }
}

// Rename file or folder
async function renameItem(oldName, isFile = false) {
    const newName = prompt(`Enter new name for "${oldName}":`, oldName);

    if (!newName || newName === oldName) return;

    // Validate name
    if (newName.includes('/') || newName.includes('\\')) {
        alert('Invalid name. Please avoid special characters.');
        return;
    }

    try {
        // Check if it's a folder by fetching current directory items
        const response = await fetch(`${API_BASE}/api/files?path=${encodeURIComponent(currentPath)}`);
        const items = await response.json();
        const item = items.find(i => i.name === oldName);
        const isFolder = item && item.isDirectory;

        let renameResponse;

        if (isFolder) {
            // Rename folder
            const folderPath = currentPath === '/' ? oldName : `${currentPath}/${oldName}`;
            renameResponse = await fetch(`${API_BASE}/api/folders/${encodeURIComponent(folderPath)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ newName })
            });
        } else {
            // For files, we'd need a rename endpoint (not implemented yet)
            alert('File renaming not yet implemented');
            return;
        }

        if (renameResponse.ok) {
            loadFiles();
        } else {
            const error = await renameResponse.json();
            alert(error.error || 'Failed to rename');
        }
    } catch (error) {
        console.error('Error renaming:', error);
        alert('Failed to rename');
    }
}

// Utility: Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
