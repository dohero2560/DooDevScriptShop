// Fetch and display scripts
async function loadScripts() {
    try {
        const response = await fetch('/api/scripts');
        const scripts = await response.json();
        
        console.log('Loaded scripts:', scripts);
        
        const container = document.getElementById('scripts-container');
        container.innerHTML = '';
        
        if (scripts.length === 0) {
            container.innerHTML = '<p class="no-scripts">No scripts available</p>';
            return;
        }

        scripts.forEach(script => {
            const card = createScriptCard(script);
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading scripts:', error);
        const container = document.getElementById('scripts-container');
        container.innerHTML = '<p class="error">Error loading scripts. Please try again later.</p>';
    }
}

// Discord login
document.getElementById('loginBtn').addEventListener('click', () => {
    // window.location.href = 'https://discord.com/oauth2/authorize?client_id=1327431748262563862&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fdiscord%2Fcallback&scope=identify';
    window.location.href = 'https://discord.com/oauth2/authorize?client_id=1327431748262563862&response_type=code&redirect_uri=http%3A%2F%2Fdoodevscriptshop.onrender.com%2Fauth%2Fdiscord%2Fcallback&scope=identify';
});

// เพิ่มฟังก์ชันตรวจสอบสถานะ login
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');
        const purchasesLink = document.getElementById('purchasesLink');
        const topupLink = document.getElementById('topupLink');
        
        if (!loginBtn || !userInfo || !purchasesLink || !topupLink) return;

        if (data.loggedIn && data.user) {
            loginBtn.style.display = 'none';
            purchasesLink.style.display = 'block';
            topupLink.style.display = 'block';
            
            // สร้าง avatar element และรอให้โหลดเสร็จก่อนแสดงผล
            const avatarImg = new Image();
            avatarImg.onload = () => {
                userInfo.innerHTML = `
                    <div class="user-profile">
                        <img src="${data.user.avatar}" 
                             alt="Discord Avatar" 
                             class="avatar">
                        <div class="user-details">
                            <span class="username">${data.user.username}</span>
                            <span class="points">💰 ${data.user.points || 0} Points</span>
                        </div>
                        <a href="/auth/logout" class="logout-btn">Logout</a>
                    </div>
                `;
                userInfo.style.display = 'flex';
            };
            
            avatarImg.onerror = () => {
                userInfo.innerHTML = `
                    <div class="user-profile">
                        <div class="user-details">
                            <span class="username">${data.user.username}</span>
                            <span class="points">💰 ${data.user.points || 0} Points</span>
                        </div>
                        <a href="/auth/logout" class="logout-btn">Logout</a>
                    </div>
                `;
                userInfo.style.display = 'flex';
            };
            
            avatarImg.src = data.user.avatar;
        } else {
            loginBtn.style.display = 'block';
            userInfo.style.display = 'none';
            purchasesLink.style.display = 'none';
            topupLink.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking login status:', error);
    }
}

// เพิ่มฟังก์ชันสำหรับ login
function login() {
    window.location.href = '/auth/discord';
}

// เพิ่มฟังก์ชันสำหรับ logout
function logout() {
    window.location.href = '/auth/logout';
}

// เพิ่ม event listener สำหรับปุ่ม login
document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.onclick = login;
    }
});

// เรียกใช้ loadScripts เมื่อโหลดหน้า
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing...');
    loadScripts();
    checkLoginStatus();
    
    // เพิ่มการตรวจสอบและ initialize cart modal
    const cartButton = document.getElementById('cartButton');
    const modal = document.getElementById('cartModal');
    const closeBtn = document.querySelector('.close');
    
    if (cartButton && modal && closeBtn) {
        cartButton.onclick = () => {
            modal.style.display = 'block';
            updateCartDisplay();
        };
        
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
        
        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        };
    }
});

function createScriptCard(script) {
    console.log('Creating card for script:', script);
    const card = document.createElement('div');
    card.className = 'script-card';
    card.innerHTML = `
        <img src="${script.imageUrl}" alt="${script.name}" class="script-thumbnail">
        <div class="script-info">
            <h3>${script.name}</h3>
            <p>${script.shortDescription}</p>
            <div class="price">$${script.price}</div>
            <div class="card-actions">
                <button onclick="window.location.href='/script-details.html?id=${script._id}'" class="view-details-btn">
                    View Details
                </button>
                <button onclick="addToCart('${script._id}')" class="add-to-cart-btn">
                    Add to Cart
                </button>
            </div>
        </div>
    `;
    return card;
}

// Cart functions
async function addToCart(scriptId) {
    try {
        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ scriptId })
        });
        
        if (!response.ok) {
            const data = await response.json();
            if (data.error === 'Item already in cart') {
                showNotification('This item is already in your cart', 'error');
                return;
            }
            throw new Error('Failed to add to cart');
        }
        
        updateCartDisplay();
        updateCartCount();
        showNotification('Added to cart successfully!');
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Failed to add to cart', 'error');
    }
}

async function removeFromCart(scriptId) {
    try {
        const response = await fetch('/api/cart/remove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ scriptId })
        });
        
        if (!response.ok) {
            throw new Error('Failed to remove from cart');
        }
        
        updateCartDisplay();
        updateCartCount();
        showNotification('Removed from cart');
    } catch (error) {
        console.error('Error removing from cart:', error);
        showNotification('Failed to remove from cart', 'error');
    }
}

async function checkout() {
    try {
        const response = await fetch('/api/cart/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            if (data.error === 'Insufficient points') {
                showNotification(`Insufficient points. You need ${data.required} points but have ${data.current}`, 'error');
            } else {
                showNotification(data.error, 'error');
            }
            return;
        }

        // Clear cart display
        updateCartDisplay();
        
        // Show success message with purchase details
        let message = `Purchase successful!\n`;
        message += `Total cost: ${data.totalCost} points\n`;
        message += `Remaining points: ${data.remainingPoints}\n\n`;
        message += `Your purchases:\n`;
        data.purchases.forEach(p => {
            message += `Resource Name: ${p.resourceName}\n`;
            message += `License: ${p.license}\n`;
        });

        showNotification(message, 'success');
        
        // Close cart modal
        const modal = document.getElementById('cartModal');
        if (modal) modal.style.display = 'none';
        
    } catch (error) {
        console.error('Checkout error:', error);
        showNotification('Error during checkout', 'error');
    }
}

async function updateCartDisplay() {
    try {
        const response = await fetch('/api/cart');
        const cartItems = await response.json();
        
        const cartContainer = document.getElementById('cartItems');
        if (!cartContainer) return;
        
        if (cartItems.length === 0) {
            cartContainer.innerHTML = '<p>Your cart is empty</p>';
            updateCartCount();
            return;
        }
        
        let totalCost = 0;
        let cartHTML = '<div class="cart-items">';
        
        cartItems.forEach(item => {
            totalCost += item.price * item.quantity;
            cartHTML += `
                <div class="cart-item">
                    <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-details">
                        <h3>${item.name}</h3>
                        <p>Price: ${item.price} points</p>
                        <p>Quantity: ${item.quantity}</p>
                    </div>
                    <button onclick="removeFromCart('${item.scriptId}')" class="remove-btn">Remove</button>
                </div>
            `;
        });
        
        cartHTML += `
            </div>
            <div class="cart-summary">
                <p>Total: ${totalCost} points</p>
                <button onclick="checkout()" class="checkout-btn">Checkout</button>
            </div>
        `;
        
        cartContainer.innerHTML = cartHTML;
        updateCartCount();
    } catch (error) {
        console.error('Error updating cart:', error);
        showNotification('Failed to update cart', 'error');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// เรียกใช้ฟังก์ชันเมื่อโหลดหน้า
document.addEventListener('DOMContentLoaded', checkLoginStatus); 

// Function to update cart count
async function updateCartCount() {
    try {
        const response = await fetch('/api/cart');
        if (!response.ok) {
            throw new Error('Failed to fetch cart');
        }
        const cartItems = await response.json();
        
        // Calculate total quantity
        const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);
        
        // Update cart count display
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = totalQuantity;
            cartCount.style.display = totalQuantity > 0 ? 'block' : 'none';
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
} 

async function updateServerIP(purchaseId) {
    try {
        const serverIP = prompt('Please enter your Server IP:');
        if (serverIP === null) return; // ผู้ใช้กด Cancel
        if (!serverIP.trim()) {
            alert('Server IP is required');
            return;
        }

        const response = await fetch(`/api/purchases/${purchaseId}/server-ip`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // เพิ่มส่วนนี้เพื่อส่ง cookies
            body: JSON.stringify({ serverIP: serverIP.trim() })
        });

        if (!response.ok) {
            throw new Error('Failed to update server IP');
        }

        const data = await response.json();
        
        if (data.success) {
            // อัพเดทหน้าเว็บ
            location.reload(); // รีโหลดหน้าเพื่อแสดงข้อมูลใหม่
        } else {
            throw new Error(data.error || 'Failed to update server IP');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating server IP: ' + error.message);
    }
} 

// เพิ่มฟังก์ชันสำหรับสลับวิธีการชำระเงิน
document.querySelectorAll('.method-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // ลบ active class จากทุกปุ่ม
        document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
        // เพิ่ม active class ให้ปุ่มที่ถูกคลิก
        this.classList.add('active');
        
        // ซ่อนทุก section
        document.querySelectorAll('.payment-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // แสดง section ที่เกี่ยวข้อง
        const method = this.dataset.method;
        document.getElementById(`${method}PaymentSection`).classList.add('active');
    });
});

// QR Code Generation
async function generatePaymentQR() {
    try {
        const amount = document.getElementById('qrTopupAmount').value;
        if (!amount || amount <= 0) {
            showNotification('Please enter a valid amount', 'error');
            return;
        }
        
        const response = await fetch('/api/payments/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ amount: Number(amount) })
        });

        if (!response.ok) throw new Error('Failed to generate payment');

        const data = await response.json();
        
        // แสดง QR Code และข้อมูลการชำระเงิน
        document.getElementById('qrCodeImage').src = data.qrCode;
        document.getElementById('paymentReference').textContent = data.reference;
        document.getElementById('paymentAmount').textContent = data.amount;
        document.getElementById('qrCodeContainer').style.display = 'block';
        
        // เริ่มตรวจสอบสถานะการชำระเงิน
        checkPaymentStatus(data.reference);
    } catch (error) {
        console.error('Error generating QR code:', error);
        showNotification('Failed to generate QR code', 'error');
    }
}

// Slip Upload
document.getElementById('slipFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('slipPreview');
            preview.innerHTML = `<img src="${e.target.result}" alt="Slip preview">`;
        }
        reader.readAsDataURL(file);
    }
});

document.getElementById('submitSlipBtn').addEventListener('click', async function() {
    const amount = document.getElementById('slipTopupAmount').value;
    const slipFile = document.getElementById('slipFile').files[0];

    if (!amount || !slipFile) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('amount', amount);
    formData.append('slip', slipFile);

    try {
        const response = await fetch('/api/topup/request', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (!response.ok) throw new Error('Failed to submit payment');

        const data = await response.json();
        showNotification('Payment slip submitted successfully', 'success');
        document.getElementById('topupModal').style.display = 'none';
    } catch (error) {
        console.error('Error submitting payment:', error);
        showNotification('Failed to submit payment', 'error');
    }
});

// Event Listeners
document.getElementById('generateQRBtn').addEventListener('click', generatePaymentQR); 

// Event Listeners for TOPUP link
document.addEventListener('DOMContentLoaded', function() {
    const topupLink = document.getElementById('topupLink');
    const topupModal = document.getElementById('topupModal');
    const closeBtn = topupModal?.querySelector('.close');
    
    if (topupLink && topupModal) {
        topupLink.onclick = () => {
            topupModal.style.display = 'block';
        };
        
        if (closeBtn) {
            closeBtn.onclick = () => {
                topupModal.style.display = 'none';
            };
        }
        
        window.onclick = (event) => {
            if (event.target == topupModal) {
                topupModal.style.display = 'none';
            }
        };
    }
}); 

// เพิ่มฟังก์ชัน checkPaymentStatus
async function checkPaymentStatus(reference) {
    try {
        const response = await fetch(`/api/payments/${reference}`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to check payment status');
        
        const data = await response.json();
        
        if (data.status === 'completed') {
            showNotification('Payment completed successfully!', 'success');
            document.getElementById('topupModal').style.display = 'none';
            // อัพเดทยอดเงินของผู้ใช้
            await checkLoginStatus();
        } else if (data.status === 'pending') {
            // ตรวจสอบสถานะทุก 10 วินาที
            setTimeout(() => checkPaymentStatus(reference), 10000);
        } else {
            showNotification('Payment failed or expired', 'error');
        }
    } catch (error) {
        console.error('Error checking payment status:', error);
        showNotification('Failed to check payment status', 'error');
    }
} 