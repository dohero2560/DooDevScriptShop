const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const { isAdmin } = require('../middleware/auth');

// Get all payments with optional status filter
router.get('/payments', isAdmin, async (req, res) => {
    try {
        const query = req.query.status ? { status: req.query.status } : {};
        const payments = await Payment.find(query)
            .populate('userId', 'username')
            .sort({ createdAt: -1 });
        
        res.json(payments);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// Reject payment
router.post('/payment/reject/:paymentId', isAdmin, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.paymentId);
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ error: 'Payment already processed' });
        }

        payment.status = 'rejected';
        payment.approvedAt = new Date();
        payment.approvedBy = req.user._id;
        await payment.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Error rejecting payment:', error);
        res.status(500).json({ error: 'Failed to reject payment' });
    }
});

module.exports = router; 