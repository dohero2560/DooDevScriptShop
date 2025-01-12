const express = require('express');
const router = express.Router();
const generatePayload = require('promptpay-qr');
const QRCode = require('qrcode');
const User = require('../models/User');

// PromptPay number for receiving payments
const PROMPTPAY_ID = '0648835624'; // Replace with your PromptPay number

// Generate QR Code for payment
router.post('/api/payments/generate-qr', async (req, res) => {
    try {
        console.log('Request body:', req.body); // Debug log

        if (!req.body || typeof req.body.amount === 'undefined') {
            return res.status(400).json({ 
                error: 'Missing amount in request body',
                received: req.body 
            });
        }

        const amount = parseFloat(req.body.amount);
        
        // Validate amount
        if (isNaN(amount) || amount < 1) {
            return res.status(400).json({ 
                error: 'Invalid amount. Must be a number greater than or equal to 1',
                received: amount 
            });
        }

        // Generate PromptPay payload
        const payload = generatePayload(PROMPTPAY_ID, { amount });
        
        // Generate QR Code
        const qrCode = await QRCode.toDataURL(payload);
        
        res.json({
            success: true,
            qrCode,
            amount,
            reference: Date.now().toString()
        });
    } catch (error) {
        console.error('Error details:', error); // Debug log
        res.status(500).json({ 
            error: 'Failed to generate QR code',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Verify payment (webhook endpoint for bank notification)
router.post('/api/payments/verify', async (req, res) => {
    try {
        console.log('Payment verification request:', req.body); // Debug log

        const { reference, amount, userId } = req.body;
        
        if (!reference || !amount || !userId) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['reference', 'amount', 'userId'],
                received: req.body 
            });
        }

        // Add points to user account
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                error: 'User not found',
                userId 
            });
        }

        // Convert amount to points (1 baht = 1 point)
        const points = Math.floor(amount);
        const previousPoints = user.points;
        user.points += points;
        await user.save();

        console.log(`Updated points for user ${userId}: ${previousPoints} -> ${user.points}`); // Debug log

        res.json({ 
            success: true, 
            newBalance: user.points,
            pointsAdded: points,
            previousBalance: previousPoints
        });
    } catch (error) {
        console.error('Payment verification error:', error); // Debug log
        res.status(500).json({ 
            error: 'Failed to verify payment',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Add a test endpoint to check if the route is working
router.get('/api/payments/test', (req, res) => {
    res.json({ 
        status: 'Payments API is working',
        timestamp: new Date().toISOString()
    });
});

module.exports = router; 