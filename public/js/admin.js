class AdminPanel {
    constructor() {
        this.init();
        this.currentSection = 'scripts';
        this.initializeModals();
    }

    async init() {
        await this.checkAdminStatus();
        this.bindEvents();
        this.loadScripts();
        this.loadUsers();
        await this.loadPurchases();
        this.setupNavigation();
        this.setupModal();
    }

    setupNavigation() {
        // Setup sidebar navigation
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.getAttribute('href').replace('#', '');
                this.switchSection(section);
            });
        });
    }

    switchSection(section) {
        // Remove active class from all links
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.classList.remove('active');
        });

        // Add active class to current section link
        const activeLink = document.querySelector(`.sidebar-nav a[href="#${section}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });

        // Show current section
        const currentSection = document.getElementById(`${section}-section`);
        if (currentSection) {
            currentSection.style.display = 'block';
            // โหลดข้อมูลเมื่อเปลี่ยนแท็บ
            if (section === 'purchases') {
                this.loadPurchases();
            }
        }
        this.currentSection = section;
    }

    setupModal() {
        // Close modal when clicking the X or outside the modal
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('.close');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    modal.style.display = 'none';
                };
            }
        });

        // Close modal when clicking outside
        window.onclick = (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        };

        // Setup Add Script button
        const addScriptBtn = document.querySelector('.add-script-btn');
        if (addScriptBtn) {
            addScriptBtn.onclick = () => {
                const modal = document.getElementById('addScriptModal');
                if (modal) {
                    modal.style.display = 'block';
                }
            };
        }

        // Setup form submissions
        const addScriptForm = document.getElementById('addScriptForm');
        if (addScriptForm) {
            addScriptForm.onsubmit = (e) => {
                e.preventDefault();
                this.handleAddScript(e);
            };
        }

        const editScriptForm = document.getElementById('editScriptForm');
        if (editScriptForm) {
            editScriptForm.onsubmit = (e) => {
                e.preventDefault();
                this.handleEditScript(e);
            };
        }

        // Setup image preview
        const imageUrlInputs = document.querySelectorAll('input[name="imageUrl"]');
        imageUrlInputs.forEach(input => {
            input.onchange = (e) => {
                const preview = e.target.parentElement.querySelector('.image-preview');
                if (preview) {
                    preview.src = e.target.value;
                    preview.style.display = 'block';
                }
            };
        });
    }

    async checkAdminStatus() {
        try {
            const response = await fetch('/api/user', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (!data.loggedIn || !data.user.isAdmin) {
                window.location.href = '/';
                return;
            }

            // Update user info in top bar
            document.querySelector('.user-name').textContent = data.user.username;
            if (data.user.avatar) {
                document.querySelector('.avatar').src = data.user.avatar;
            }
        } catch (err) {
            console.error('Error checking admin status:', err);
            window.location.href = '/';
        }
    }

    bindEvents() {
        // Add Script Form
        const addScriptForm = document.getElementById('addScriptForm');
        if (addScriptForm) {
            addScriptForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                await this.addScript(formData);
            });
        }

        // Add Script Button
        const addScriptBtn = document.querySelector('.add-script-btn');
        if (addScriptBtn) {
            addScriptBtn.addEventListener('click', () => {
                document.getElementById('addScriptModal').style.display = 'block';
            });
        }

        // Search functionality
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                this.filterTable(searchTerm);
            });
        }

        // Role filter
        const roleFilter = document.querySelector('.role-filter');
        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                this.filterUsersByRole(e.target.value);
            });
        }

        const statusFilter = document.querySelector('.status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterPurchasesByStatus(e.target.value);
            });
        }
    }

    filterTable(searchTerm) {
        const table = this.currentSection === 'scripts' ? 
            document.getElementById('scriptTable') : 
            document.getElementById('userTable');
        
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    filterUsersByRole(role) {
        const rows = document.querySelectorAll('#userTable tbody tr');
        rows.forEach(row => {
            if (!role || row.querySelector('td:nth-child(4)').textContent === role) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    async loadScripts() {
        try {
            const response = await fetch('/api/scripts', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch scripts');
            const scripts = await response.json();
            this.renderScripts(scripts);
        } catch (err) {
            console.error('Error loading scripts:', err);
            this.showError('Failed to load scripts');
        }
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/admin/users', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch users');
            const users = await response.json();
            this.renderUsers(users);
        } catch (err) {
            console.error('Error loading users:', err);
            this.showError('Failed to load users');
        }
    }

    renderScripts(scripts) {
        const tbody = document.querySelector('#scriptTable tbody');
        if (!tbody) return;

        tbody.innerHTML = scripts.map(script => `
            <tr>
                <td>${script.name || ''}</td>
                <td>${script.price || 0}</td>
                <td>${script.category || ''}</td>
                <td><span class="status-badge status-active">Active</span></td>
                <td>
                    <button class="secondary-btn" onclick="adminPanel.editScript('${script._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="secondary-btn" onclick="adminPanel.deleteScript('${script._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderUsers(users) {
        const tbody = document.querySelector('#userTable tbody');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.username || ''}</td>
                <td>${user.email || ''}</td>
                <td>${user.points || 0}</td>
                <td>${user.role || 'user'}</td>
                <td>
                    <span class="status-badge ${user.isAdmin ? 'status-active' : 'status-inactive'}">
                        ${user.isAdmin ? 'Admin' : 'User'}
                    </span>
                </td>
                <td>
                    <button class="secondary-btn" onclick="adminPanel.editUser('${user._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="secondary-btn" onclick="adminPanel.editPoints('${user._id}', ${user.points})">
                        <i class="fas fa-coins"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async addScript(formData) {
        try {
            const scriptData = Object.fromEntries(formData.entries());
            const response = await fetch('/api/admin/scripts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(scriptData)
            });

            if (!response.ok) throw new Error('Failed to add script');

            await this.loadScripts();
            this.closeModal();
            this.showSuccess('Script added successfully');
        } catch (err) {
            console.error('Error adding script:', err);
            this.showError('Failed to add script');
        }
    }

    async editScript(scriptId) {
        try {
            const response = await fetch(`/api/scripts/${scriptId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to fetch script');
            
            const script = await response.json();
            const modal = document.getElementById('editScriptModal');
            const form = document.getElementById('editScriptForm');

            // Populate form fields
            form.scriptId.value = script._id;
            form.name.value = script.name || '';
            form.shortDescription.value = script.shortDescription || '';
            form.description.value = script.description || '';
            form.price.value = script.price || 0;
            form.imageUrl.value = script.imageUrl || '';
            form.downloadUrl.value = script.downloadUrl || '';
            form.resourceName.value = script.resourceName || '';
            form.version.value = script.version || '';
            form.category.value = script.category || 'other';
            form.features.value = Array.isArray(script.features) ? script.features.join('\n') : '';
            form.compatibility.value = script.compatibility || '';
            form.instructions.value = script.instructions || '';

            // Show modal
            modal.style.display = 'block';

            // Handle form submission
            form.onsubmit = async (e) => {
                e.preventDefault();
                await this.updateScript(form);
            };
        } catch (err) {
            console.error('Error editing script:', err);
            this.showError('Failed to load script details');
        }
    }

    async updateScript(form) {
        try {
            const scriptId = form.scriptId.value;
            const formData = new FormData(form);
            
            // Convert features from text to array
            const featuresText = formData.get('features');
            const features = featuresText.split('\n')
                .map(feature => feature.trim())
                .filter(feature => feature.length > 0);

            const scriptData = {
                name: formData.get('name'),
                shortDescription: formData.get('shortDescription'),
                description: formData.get('description'),
                price: Number(formData.get('price')),
                imageUrl: formData.get('imageUrl'),
                downloadUrl: formData.get('downloadUrl'),
                resourceName: formData.get('resourceName'),
                version: formData.get('version'),
                category: formData.get('category'),
                features,
                compatibility: formData.get('compatibility'),
                instructions: formData.get('instructions')
            };

            const response = await fetch(`/api/admin/scripts/${scriptId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(scriptData)
            });

            if (!response.ok) throw new Error('Failed to update script');

            await this.loadScripts(); // Refresh scripts list
            this.closeEditScriptModal();
            this.showSuccess('Script updated successfully');
        } catch (err) {
            console.error('Error updating script:', err);
            this.showError('Failed to update script');
        }
    }

    async deleteScript(scriptId) {
        if (!confirm('Are you sure you want to delete this script?')) return;
        
        try {
            const response = await fetch(`/api/admin/scripts/${scriptId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to delete script');

            await this.loadScripts();
            this.showSuccess('Script deleted successfully');
        } catch (err) {
            console.error('Error deleting script:', err);
            this.showError('Failed to delete script');
        }
    }

    async editUser(userId) {
        try {
            const user = await this.fetchUser(userId);
            if (!user) return;

            const modal = document.getElementById('editUserModal');
            const form = document.getElementById('editUserForm');

            // Populate form fields
            form.userId.value = user._id;
            form.role.value = user.role || 'user';
            form.points.value = user.points || 0;

            // Set permissions checkboxes
            const permissions = user.permissions || [];
            form.querySelectorAll('input[name="permissions"]').forEach(checkbox => {
                checkbox.checked = permissions.includes(checkbox.value);
            });

            // Show modal
            modal.style.display = 'block';

            // Handle form submission
            form.onsubmit = async (e) => {
                e.preventDefault();
                await this.updateUser(form);
            };
        } catch (err) {
            console.error('Error editing user:', err);
            this.showError('Failed to load user details');
        }
    }

    async updateUser(form) {
        try {
            const userId = form.userId.value;
            const permissions = Array.from(form.querySelectorAll('input[name="permissions"]:checked'))
                .map(checkbox => checkbox.value);

            const userData = {
                role: form.role.value,
                points: Number(form.points.value),
                permissions
            };

            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(userData)
            });

            if (!response.ok) throw new Error('Failed to update user');

            await this.loadUsers();
            this.closeEditUserModal();
            this.showSuccess('User updated successfully');
        } catch (err) {
            console.error('Error updating user:', err);
            this.showError('Failed to update user');
        }
    }

    async editPoints(userId, currentPoints) {
        try {
            const newPoints = prompt('Enter new points amount:', currentPoints);
            if (!newPoints || isNaN(newPoints)) return;

            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    points: Number(newPoints)
                })
            });

            if (!response.ok) throw new Error('Failed to update points');

            await this.loadUsers();
            this.showSuccess('Points updated successfully');
        } catch (err) {
            console.error('Error updating points:', err);
            this.showError('Failed to update points');
        }
    }

    async fetchScript(scriptId) {
        try {
            const response = await fetch(`/api/scripts/${scriptId}`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch script');
            return await response.json();
        } catch (err) {
            console.error('Error fetching script:', err);
            this.showError('Error fetching script details');
            return null;
        }
    }

    async fetchUser(userId) {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch user');
            return await response.json();
        } catch (err) {
            console.error('Error fetching user:', err);
            this.showError('Error fetching user details');
            return null;
        }
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }

    closeEditScriptModal() {
        const modal = document.getElementById('editScriptModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    closeEditUserModal() {
        const modal = document.getElementById('editUserModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showSuccess(message) {
        // Implement your success notification here
        alert(message); // หรือใช้ระบบ notification ที่สวยงามกว่า
    }

    showError(message) {
        // Implement your error notification here
        alert(message); // หรือใช้ระบบ notification ที่สวยงามกว่า
    }

    initializeModals() {
        // Get all close buttons and modals
        const closeButtons = document.querySelectorAll('.modal .close');
        const modals = document.querySelectorAll('.modal');

        // Add click event to close buttons
        closeButtons.forEach(button => {
            button.onclick = () => {
                const modal = button.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                    // Reset form if exists
                    const form = modal.querySelector('form');
                    if (form) form.reset();
                }
            };
        });

        // Close modal when clicking outside
        window.onclick = (event) => {
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                    // Reset form if exists
                    const form = modal.querySelector('form');
                    if (form) form.reset();
                }
            });
        };
    }

    async manageVersions(scriptId) {
        try {
            const script = await this.fetchScript(scriptId);
            if (!script) return;

            const modal = document.getElementById('manageVersionsModal');
            const form = document.getElementById('addVersionForm');
            form.scriptId.value = scriptId;

            // แสดงรายการเวอร์ชัน
            await this.loadVersions(scriptId);
            
            modal.style.display = 'block';
        } catch (err) {
            console.error('Error managing versions:', err);
            this.showError('Failed to load versions');
        }
    }

    async loadVersions(scriptId) {
        try {
            const response = await fetch(`/api/scripts/${scriptId}/versions`);
            if (!response.ok) throw new Error('Failed to fetch versions');
            
            const versions = await response.json();
            const versionsList = document.getElementById('versionsList');
            
            versionsList.innerHTML = versions.map(version => `
                <div class="version-item">
                    <div class="version-info">
                        <div class="version-header">
                            <span class="version-number">Version ${version.number}</span>
                            <span class="version-status ${version.isActive ? 'status-active' : 'status-inactive'}">
                                ${version.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span class="version-date">
                                Released: ${new Date(version.releaseDate).toLocaleDateString()}
                            </span>
                        </div>
                        <div class="version-changes">
                            <strong>Changes:</strong>
                            <ul>
                                ${version.changes.map(change => `<li>${change}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                    <div class="version-actions">
                        <button class="secondary-btn" onclick="adminPanel.toggleVersionStatus('${scriptId}', '${version._id}', ${!version.isActive})">
                            ${version.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button class="danger-btn" onclick="adminPanel.deleteVersion('${scriptId}', '${version._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            console.error('Error loading versions:', err);
            this.showError('Failed to load versions');
        }
    }

    showAddVersionForm() {
        const form = document.getElementById('addVersionForm');
        if (form) {
            form.style.display = 'block';
        }
    }

    hideAddVersionForm() {
        const form = document.getElementById('addVersionForm');
        if (form) {
            form.style.display = 'none';
        }
    }

    async addVersion(event) {
        event.preventDefault();
        const form = event.target;
        const scriptId = form.scriptId.value;

        try {
            const changes = form.changes.value
                .split('\n')
                .map(change => change.trim())
                .filter(change => change.length > 0);

            const versionData = {
                number: form.number.value,
                downloadUrl: form.downloadUrl.value,
                changes
            };

            const response = await fetch(`/api/admin/scripts/${scriptId}/versions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(versionData)
            });

            if (!response.ok) throw new Error('Failed to add version');

            await this.loadVersions(scriptId);
            this.hideAddVersionForm();
            this.showSuccess('Version added successfully');
        } catch (err) {
            console.error('Error adding version:', err);
            this.showError('Failed to add version');
        }
    }

    async toggleVersionStatus(scriptId, versionId, newStatus) {
        try {
            const response = await fetch(`/api/admin/scripts/${scriptId}/versions/${versionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: newStatus })
            });

            if (!response.ok) throw new Error('Failed to update version status');

            await this.loadVersions(scriptId);
            this.showSuccess('Version status updated');
        } catch (err) {
            console.error('Error updating version status:', err);
            this.showError('Failed to update version status');
        }
    }

    async deleteVersion(scriptId, versionId) {
        if (!confirm('Are you sure you want to delete this version?')) return;

        try {
            const response = await fetch(`/api/admin/scripts/${scriptId}/versions/${versionId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete version');

            await this.loadVersions(scriptId);
            this.showSuccess('Version deleted successfully');
        } catch (err) {
            console.error('Error deleting version:', err);
            this.showError('Failed to delete version');
        }
    }

    async loadPurchases() {
        try {
            const response = await fetch('/api/admin/purchases', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch purchases');
            const purchases = await response.json();
            this.renderPurchases(purchases);
        } catch (err) {
            console.error('Error loading purchases:', err);
            this.showError('Failed to load purchases');
        }
    }

    renderPurchases(purchases) {
        this.purchases = purchases;
        const tbody = document.querySelector('#purchaseTable tbody');
        if (!tbody) return;

        tbody.innerHTML = purchases.map(purchase => `
            <tr>
                <td>${new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                <td>
                    ${purchase.userId?.username || 'Unknown'}
                    <br>
                    <small class="text-muted">Discord ID: ${purchase.userId?.discordId || 'N/A'}</small>
                </td>
                <td>${purchase.scriptId?.name || 'Unknown'}</td>
                <td>${purchase.license || ''}</td>
                <td>${purchase.serverIP || 'Not set'}</td>
                <td>
                    <span class="status-badge ${purchase.status === 'active' ? 'status-active' : 'status-inactive'}">
                        ${purchase.status || 'Unknown'}
                    </span>
                </td>
                <td>
                    <button class="action-btn edit-btn" onclick="adminPanel.openEditPurchaseModal('${purchase._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn status-btn" onclick="adminPanel.updatePurchaseStatus('${purchase._id}')">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async updatePurchaseStatus(purchaseId) {
        try {
            const response = await fetch(`/api/admin/purchases/${purchaseId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    status: 'revoked' // หรือ 'active' ตามสถานะปัจจุบัน
                })
            });

            if (!response.ok) throw new Error('Failed to update purchase status');
            await this.loadPurchases(); // โหลดข้อมูลใหม่
            this.showSuccess('Purchase status updated successfully');
        } catch (err) {
            console.error('Error updating purchase status:', err);
            this.showError('Failed to update purchase status');
        }
    }

    openEditPurchaseModal(purchaseId) {
        try {
            const purchase = this.purchases.find(p => p._id === purchaseId);
            if (!purchase) return;

            // Fill modal with purchase data
            const modal = document.getElementById('editPurchaseModal');
            modal.querySelector('[name="purchaseId"]').value = purchase._id;
            modal.querySelector('[name="license"]').value = purchase.license;
            modal.querySelector('[name="serverIP"]').value = purchase.serverIP || '';
            modal.querySelector('[name="status"]').value = purchase.status;

            // Show modal
            modal.style.display = 'block';
        } catch (err) {
            console.error('Error opening edit purchase modal:', err);
            this.showError('Failed to open edit modal');
        }
    }

    async savePurchaseEdit(event) {
        event.preventDefault();
        const form = event.target;
        const purchaseId = form.querySelector('[name="purchaseId"]').value;

        try {
            const formData = {
                license: form.querySelector('[name="license"]').value,
                serverIP: form.querySelector('[name="serverIP"]').value,
                status: form.querySelector('[name="status"]').value
            };

            const response = await fetch(`/api/admin/purchases/${purchaseId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to update purchase');

            // Close modal and reload purchases
            document.getElementById('editPurchaseModal').style.display = 'none';
            await this.loadPurchases();
            this.showSuccess('Purchase updated successfully');
        } catch (err) {
            console.error('Error saving purchase:', err);
            this.showError('Failed to save purchase changes');
        }
    }

    filterPurchasesByStatus(status) {
        const rows = document.querySelectorAll('#purchaseTable tbody tr');
        rows.forEach(row => {
            if (!status) {
                row.style.display = '';
                return;
            }
            const statusCell = row.querySelector('td:nth-child(6)'); // ปรับตามคอลัมน์ status
            const rowStatus = statusCell.textContent.trim().toLowerCase();
            row.style.display = rowStatus === status.toLowerCase() ? '' : 'none';
        });
    }

    async loadLogs(filters = {}) {
        try {
            const queryParams = new URLSearchParams(filters);
            const response = await fetch(`/api/admin/logs?${queryParams}`, {
                credentials: 'include'
            });
            const logs = await response.json();
            this.renderLogs(logs);
        } catch (err) {
            console.error('Error loading logs:', err);
            this.showError('Failed to load activity logs');
        }
    }

    renderLogs(logs) {
        const tbody = document.querySelector('#logsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.adminId.username}</td>
                <td>${this.formatAction(log.action)}</td>
                <td>${this.formatEntityType(log.entityType)}</td>
                <td>
                    <span class="log-details">${this.formatChanges(log.changes)}</span>
                    <i class="fas fa-info-circle log-details-btn" 
                        onclick="adminPanel.showLogDetails(${JSON.stringify(log)})"
                    ></i>
                </td>
            </tr>
        `).join('');
    }

    formatAction(action) {
        const formats = {
            create: '<span class="badge badge-success">Created</span>',
            update: '<span class="badge badge-warning">Updated</span>',
            delete: '<span class="badge badge-danger">Deleted</span>',
            status_change: '<span class="badge badge-info">Status Changed</span>'
        };
        return formats[action] || action;
    }

    formatEntityType(type) {
        return type.charAt(0).toUpperCase() + type.slice(1);
    }

    formatChanges(changes) {
        if (changes.before && changes.after) {
            const changedFields = Object.keys(changes.after).filter(
                key => JSON.stringify(changes.before[key]) !== JSON.stringify(changes.after[key])
            );
            return `Modified fields: ${changedFields.join(', ')}`;
        }
        return JSON.stringify(changes).slice(0, 50) + '...';
    }

    showLogDetails(log) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Log Details</h2>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <pre>${JSON.stringify(log.changes, null, 2)}</pre>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'block';

        modal.querySelector('.close').onclick = () => {
            modal.remove();
        };
    }
}

// Initialize the admin panel
const adminPanel = new AdminPanel();

// Make adminPanel available globally for onclick handlers
window.adminPanel = adminPanel;

// เพิ่มฟังก์ชันสำหรับแสดงตัวอย่างรูปภาพ
function setupImagePreview(formId) {
    const form = document.getElementById(formId);
    const imageUrlInput = form.querySelector('input[name="imageUrl"]');
    const imagePreview = form.querySelector('#imagePreview');

    imageUrlInput.addEventListener('input', function() {
        const url = this.value.trim();
        if (url) {
            imagePreview.src = url;
            imagePreview.style.display = 'block';
            
            // ตรวจสอบการโหลดรูปภาพ
            imagePreview.onload = function() {
                imagePreview.style.display = 'block';
            };
            imagePreview.onerror = function() {
                imagePreview.style.display = 'none';
                showError('Invalid image URL');
            };
        } else {
            imagePreview.style.display = 'none';
        }
    });
}

// เรียกใช้ฟังก์ชันกับทั้งฟอร์มเพิ่มและแก้ไข
document.addEventListener('DOMContentLoaded', function() {
    setupImagePreview('addScriptForm');
    setupImagePreview('editScriptForm');
});

// Add event listeners for filters
document.querySelector('.log-type-filter')?.addEventListener('change', (e) => {
    adminPanel.loadLogs({ action: e.target.value });
});

document.querySelector('.entity-type-filter')?.addEventListener('change', (e) => {
    adminPanel.loadLogs({ entityType: e.target.value });
});

document.querySelector('.date-filter')?.addEventListener('change', (e) => {
    adminPanel.loadLogs({ date: e.target.value });
}); 