const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const User = require('../models/User');
const { generatePayload } = require('promptpay-qr');
const qrcode = require('qrcode');
const multer = require('multer');
const { authenticateUser } = require('../middleware/auth');

// Configure multer for slip upload
const storage = multer.diskStorage({
  destination: './public/uploads/slips',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `slip-${uniqueSuffix}.${file.originalname.split('.').pop()}`);
  }
});

const upload = multer({ storage });

// Generate QR Code
router.post('/generate-qr', authenticateUser, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const payload = generatePayload(process.env.PROMPTPAY_ID, { amount });
    const qrCode = await qrcode.toDataURL(payload);

    res.json({ qrCode });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Upload slip and create payment record
router.post('/upload-slip', authenticateUser, upload.single('slip'), async (req, res) => {
  try {
    const { amount } = req.body;
    const slipUrl = `/uploads/slips/${req.file.filename}`;

    const payment = new Payment({
      userId: req.user._id,
      amount: parseFloat(amount),
      slipUrl
    });

    await payment.save();
    res.json({ success: true, payment });
  } catch (error) {
    console.error('Error uploading slip:', error);
    res.status(500).json({ error: 'Failed to upload slip' });
  }
});

// Admin approve payment
router.post('/approve/:paymentId', isAdmin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment already processed' });
    }

    // Update payment status
    payment.status = 'approved';
    payment.approvedAt = new Date();
    payment.approvedBy = req.user._id;
    await payment.save();

    // Add points to user
    const user = await User.findById(payment.userId);
    user.points += payment.amount;
    await user.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error approving payment:', error);
    res.status(500).json({ error: 'Failed to approve payment' });
  }
});

module.exports = router; 