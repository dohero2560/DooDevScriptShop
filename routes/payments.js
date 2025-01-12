const express = require('express');
const router = express.Router();
const generatePayload = require('promptpay-qr');
const QRCode = require('qrcode');
const User = require('../models/User');

// PromptPay number for receiving payments
const PROMPTPAY_ID = '0812345678'; // Replace with your PromptPay number

// Generate QR Code for payment
router.post('/api/payments/generate-qr', async (req, res) => {
    try {
        const { amount } = req.body;
        
        // Validate amount
        if (!amount || amount < 1) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Generate PromptPay payload
        const payload = generatePayload(PROMPTPAY_ID, { amount });
        
        // Generate QR Code
        const qrCode = await QRCode.toDataURL(payload);
        
        res.json({
            qrCode,
            amount,
            reference: Date.now().toString() // Simple reference number
        });
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Verify payment (webhook endpoint for bank notification)
router.post('/api/payments/verify', async (req, res) => {
    try {
        const { reference, amount, userId } = req.body;
        
        // Add points to user account
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Convert amount to points (1 baht = 1 point)
        const points = Math.floor(amount);
        user.points += points;
        await user.save();

        // Log the transaction
        await logAdminAction(req, 'create', 'points', user._id, {
            before: { points: user.points - points },
            after: { points: user.points }
        });

        res.json({ success: true, newBalance: user.points });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

module.exports = router; 