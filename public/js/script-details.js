async function loadScriptDetails() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const scriptId = urlParams.get('id');
        
        if (!scriptId) {
            window.location.href = '/';
            return;
        }

        const response = await fetch(`/api/scripts/${scriptId}`);
        if (!response.ok) {
            throw new Error('Script not found');
        }

        const script = await response.json();
        console.log('Loaded script details:', script);

        const container = document.getElementById('script-details');
        container.innerHTML = `
            <div class="script-header">
                <div class="script-image-container">
                    <img src="${script.imageUrl}" alt="${script.name}" class="script-image">
                </div>
                <div class="script-info">
                    <h1>${script.name}</h1>
                    <p class="script-short-desc">${script.shortDescription}</p>
                    <div class="script-price">$${script.price}</div>
                    <div class="script-actions">
                        <button onclick="addToCart('${script._id}')" class="add-to-cart-btn">
                            Add to Cart
                        </button>
                    
                    </div>
                </div>
            </div>
            
            <div class="script-content">
                <div class="description-section">
                    <h2>Description</h2>
                    <p>${script.description}</p>
                </div>
                
                <div class="features-section">
                    <h2>Features</h2>
                    <ul class="features-list">
                        ${script.features.map(feature => `
                            <li class="feature-item">
                                <span class="feature-icon">✓</span>
                                ${feature}
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
                <div class="info-grid">
                    <div class="info-section">
                        <h2>Compatibility</h2>
                        <p>${script.compatibility}</p>
                    </div>
                    
                    <div class="info-section">
                        <h2>Version</h2>
                        <p>${script.version}</p>
                    </div>
                </div>
                
                <div class="instructions-section">
                    <h2>Installation Instructions</h2>
                    <p>${script.instructions}</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading script details:', error);
        const container = document.getElementById('script-details');
        container.innerHTML = `
            <div class="error-message">
                <h2>Error Loading Script</h2>
                <p>Unable to load script details. Please try again later.</p>
                <a href="/" class="back-link">Return to Home</a>
            </div>
        `;
    }
}

async function showDownloadModal(scriptId) {
    try {
        const response = await fetch(`/api/scripts/${scriptId}/versions`);
        if (!response.ok) throw new Error('Failed to fetch versions');
        
        const versions = await response.json();
        const modal = document.getElementById('downloadModal');
        const versionsList = document.getElementById('versionsList');
        
        versionsList.innerHTML = versions.map(version => `
            <div class="version-item">
                <div class="version-info">
                    <div class="version-number">Version ${version.number}</div>
                    <div class="version-date">${new Date(version.releaseDate).toLocaleDateString()}</div>
                    <div class="version-changes">
                        <strong>Changes:</strong>
                        <ul>
                            ${version.changes.map(change => `<li>${change}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                <button onclick="downloadVersion('${scriptId}', '${version.number}')" class="download-version-btn">
                    Download
                </button>
            </div>
        `).join('');
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading versions:', error);
        showNotification('Failed to load script versions', 'error');
    }
}

async function downloadVersion(scriptId, version) {
    try {
        const response = await fetch(`/api/scripts/${scriptId}/download/${version}`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to get download link');
        
        const data = await response.json();
        window.location.href = data.downloadUrl;
        document.getElementById('downloadModal').style.display = 'none';
        showNotification('Download started', 'success');
    } catch (error) {
        console.error('Error downloading version:', error);
        showNotification('Failed to start download', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadScriptDetails();
    checkLoginStatus();
});