const express = require('express');
const router = express.Router();
const generatePayload = require('promptpay-qr');
const QRCode = require('qrcode');
const Payment = require('../models/Payment');
const crypto = require('crypto');

// PromptPay number
const PROMPTPAY_NUMBER = "0648835624";

// Authentication Middleware
const isAuthenticated = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
};

// Admin Middleware
const isAdmin = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    
    next();
};

// Check specific permission
const hasPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user.permissions.includes(permission)) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        next();
    };
};

// Generate QR Code for payment
router.post('/api/payments/create', isAuthenticated, async (req, res) => {
  try {
    const { amount } = req.body;
    
    // Validate amount
    if (!amount || amount < 1 || amount > 100000) {
      return res.status(400).json({ 
        error: 'Invalid amount. Must be between 20 and 100,000 THB' 
      });
    }

    // Generate reference number
    const reference = crypto.randomBytes(8).toString('hex');

    // Generate PromptPay Payload
    const payload = generatePayload(PROMPTPAY_NUMBER, { amount });
    
    // Generate QR Code
    const qrCode = await QRCode.toDataURL(payload);

    // Create payment record
    const payment = new Payment({
      userId: req.user._id,
      amount,
      reference,
      qrCode
    });

    await payment.save();

    res.json({
      reference,
      qrCode,
      amount,
      expiresIn: 3600 // 1 hour
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Check payment status
router.get('/api/payments/:reference', isAuthenticated, async (req, res) => {
  try {
    const payment = await Payment.findOne({ 
      reference: req.params.reference,
      userId: req.user._id
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.createdAt
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

module.exports = router; 