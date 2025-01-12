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
      alert('Payment submitted successfully! Please wait for admin approval.');
      window.location.href = '/purchases.html';
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    alert('Error submitting payment: ' + error.message);
  }
}); 