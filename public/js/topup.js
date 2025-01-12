document.addEventListener('DOMContentLoaded', function() {
    // โหลดข้อมูล points ปัจจุบัน
    fetchCurrentPoints();

    // จัดการการส่งฟอร์ม
    const paymentForm = document.getElementById('payment-form');
    paymentForm.addEventListener('submit', handlePaymentSubmit);
});

async function fetchCurrentPoints() {
    try {
        const response = await fetch('/api/user/points');
        if (!response.ok) throw new Error('Failed to fetch points');
        const data = await response.json();
        document.getElementById('currentPoints').textContent = data.points;
    } catch (error) {
        console.error('Error fetching points:', error);
    }
}

async function handlePaymentSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    try {
        const response = await fetch('/api/payments/upload-slip', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Failed to upload payment slip');
        
        const result = await response.json();
        alert('อัพโหลดสลิปสำเร็จ กรุณารอการตรวจสอบจากแอดมิน');
        event.target.reset();
    } catch (error) {
        console.error('Error submitting payment:', error);
        alert('เกิดข้อผิดพลาดในการอัพโหลดสลิป');
    }
} 