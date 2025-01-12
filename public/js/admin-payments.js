let currentPaymentId = null;

// Load payments when page loads
document.addEventListener('DOMContentLoaded', loadPayments);

// Filter change handler
document.getElementById('statusFilter').addEventListener('change', loadPayments);

async function loadPayments() {
    try {
        const status = document.getElementById('statusFilter').value;
        const response = await fetch(`/api/admin/payments${status !== 'all' ? `?status=${status}` : ''}`);
        const payments = await response.json();
        
        const tableBody = document.getElementById('paymentsTableBody');
        tableBody.innerHTML = '';
        
        payments.forEach(payment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(payment.createdAt).toLocaleString()}</td>
                <td>${payment.userId.username}</td>
                <td>${payment.amount.toFixed(2)} THB</td>
                <td>
                    <button class="action-btn" onclick="viewSlip('${payment.slipUrl}', ${JSON.stringify(payment)})">
                        View Slip
                    </button>
                </td>
                <td>
                    <span class="payment-status status-${payment.status}">
                        ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                </td>
                <td>
                    ${payment.status === 'pending' ? `
                        <button class="action-btn approve-btn" onclick="approvePayment('${payment._id}')">
                            Approve
                        </button>
                        <button class="action-btn reject-btn" onclick="rejectPayment('${payment._id}')">
                            Reject
                        </button>
                    ` : ''}
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading payments:', error);
        alert('Failed to load payments');
    }
}

function viewSlip(slipUrl, payment) {
    currentPaymentId = payment._id;
    const modal = document.getElementById('paymentModal');
    const slipImage = document.getElementById('slipImage');
    
    document.getElementById('modalUser').textContent = payment.userId.username;
    document.getElementById('modalAmount').textContent = `${payment.amount.toFixed(2)} THB`;
    document.getElementById('modalDate').textContent = new Date(payment.createdAt).toLocaleString();
    document.getElementById('modalStatus').textContent = payment.status;
    
    slipImage.src = slipUrl;
    modal.style.display = 'block';

    // Show/hide action buttons based on payment status
    const actionsDiv = document.getElementById('modalActions');
    actionsDiv.style.display = payment.status === 'pending' ? 'flex' : 'none';
}

async function approvePayment(paymentId) {
    if (!confirm('Are you sure you want to approve this payment?')) return;

    try {
        const response = await fetch(`/api/payment/approve/${paymentId || currentPaymentId}`, {
            method: 'POST'
        });

        if (!response.ok) throw new Error('Failed to approve payment');

        alert('Payment approved successfully');
        document.getElementById('paymentModal').style.display = 'none';
        loadPayments();
    } catch (error) {
        console.error('Error approving payment:', error);
        alert('Failed to approve payment');
    }
}

async function rejectPayment(paymentId) {
    if (!confirm('Are you sure you want to reject this payment?')) return;

    try {
        const response = await fetch(`/api/payment/reject/${paymentId || currentPaymentId}`, {
            method: 'POST'
        });

        if (!response.ok) throw new Error('Failed to reject payment');

        alert('Payment rejected successfully');
        document.getElementById('paymentModal').style.display = 'none';
        loadPayments();
    } catch (error) {
        console.error('Error rejecting payment:', error);
        alert('Failed to reject payment');
    }
}

// Close modal when clicking the close button or outside the modal
document.querySelector('.close').onclick = () => {
    document.getElementById('paymentModal').style.display = 'none';
};

window.onclick = (event) => {
    const modal = document.getElementById('paymentModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}; 