async function checkLicenseStatus(license) {
    try {
        const response = await fetch(`/api/license-status/${license}`);
        if (!response.ok) {
            throw new Error('Failed to check license status');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error checking license status:', error);
        throw error;
    }
}

async function loadPurchases() {
    try {
        const response = await fetch('/api/purchases');
        const purchases = await response.json();

        const purchasesList = document.getElementById('purchases-list');
        if (purchases.length === 0) {
            purchasesList.innerHTML = '<div class="no-purchases">No purchase history found.</div>';
            return;
        }

        let html = '';
        for (const purchase of purchases) {
            // Get current license status
            let statusBadge = '';
            try {
                const licenseStatus = await checkLicenseStatus(purchase.license);
                const statusClass = licenseStatus.status === 'active' ? 'status-active' : 'status-revoked';
                statusBadge = `<span class="license-status ${statusClass}">${licenseStatus.status}</span>`;
            } catch (error) {
                statusBadge = '<span class="license-status status-error">Status unknown</span>';
            }

            html += `
                <div class="purchase-item">
                    <div class="purchase-info">
                        <div class="purchase-header">
                            <h3>${purchase.scriptId.name}</h3>
                            ${statusBadge}
                        </div>
                        <div class="purchase-details">
                            <div class="detail-item">
                                <i class="fas fa-calendar"></i>
                                <span>${new Date(purchase.purchaseDate).toLocaleDateString()}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-key"></i>
                                <span>${purchase.license}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-server"></i>
                                <span class="server-ip ${purchase.serverIP ? 'set' : 'not-set'}">
                                    ${purchase.serverIP || 'Server IP not set'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="purchase-actions">
                        <button onclick="updateServerSettings('${purchase._id}')" class="btn settings-btn">
                            <i class="fas fa-cog"></i> Update Server IP
                        </button>
                        <a href="${purchase.scriptId.downloadUrl}" class="btn download-btn">
                            <i class="fas fa-download"></i> Download Script
                        </a>
                    </div>
                </div>
            `;
        }
        purchasesList.innerHTML = html;
    } catch (error) {
        console.error('Error loading purchases:', error);
        showNotification('Failed to load purchase history', 'error');
    }
}

async function updateServerSettings(purchaseId) {
    try {
        const serverIP = prompt('Please enter your Server IP:');
        if (serverIP === null) return; // User clicked Cancel
        if (!serverIP.trim()) {
            alert('Server IP is required');
            return;
        }

        const response = await fetch(`/api/purchases/${purchaseId}/server-ip`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ serverIP: serverIP.trim() })
        });

        if (!response.ok) {
            throw new Error('Failed to update server IP');
        }

        const data = await response.json();
        
        if (data.success) {
            showNotification('Server IP updated successfully', 'success');
            location.reload(); // Reload page to show updated data
        } else {
            throw new Error(data.error || 'Failed to update server IP');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error updating server IP: ' + error.message, 'error');
    }
}

function openModal() {
    document.getElementById('slipUploadModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('slipUploadModal').style.display = 'none';
}

// Load purchases when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadPurchases();
    checkLoginStatus();
}); 