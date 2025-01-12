class PaymentWrapper {
    constructor() {
        this.initializeWrapper();
        this.setupEventListeners();
    }

    async initializeWrapper() {
        // Load payment wrapper HTML
        const response = await fetch('/components/payment-wrapper.html');
        const html = await response.text();
        
        // Create wrapper element
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);

        // Add mobile toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-payment btn btn-primary';
        toggleBtn.innerHTML = '<i class="fas fa-wallet"></i>';
        toggleBtn.style.display = 'none';
        document.body.appendChild(toggleBtn);

        // Adjust main content
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.marginRight = '300px';
        }
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('topupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            
            try {
                const response = await fetch('/api/topup', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('ส่งคำขอเติมเงินเรียบร้อย กรุณารอการยืนยันจากแอดมิน');
                    e.target.reset();
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                alert('เกิดข้อผิดพลาด: ' + error.message);
            }
        });

        // Mobile toggle
        const toggleBtn = document.querySelector('.toggle-payment');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const wrapper = document.querySelector('.payment-wrapper');
                wrapper.classList.toggle('active');
            });
        }

        // Responsive handling
        window.addEventListener('resize', this.handleResize.bind(this));
        this.handleResize();
    }

    handleResize() {
        const toggleBtn = document.querySelector('.toggle-payment');
        const wrapper = document.querySelector('.payment-wrapper');
        const mainContent = document.querySelector('.main-content');

        if (window.innerWidth <= 768) {
            toggleBtn.style.display = 'block';
            wrapper.classList.remove('active');
            if (mainContent) mainContent.style.marginRight = '0';
        } else {
            toggleBtn.style.display = 'none';
            wrapper.classList.remove('active');
            if (mainContent) mainContent.style.marginRight = '300px';
        }
    }
}

// Initialize payment wrapper
document.addEventListener('DOMContentLoaded', () => {
    new PaymentWrapper();
}); 