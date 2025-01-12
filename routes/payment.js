const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
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

// Generate QR Code - endpoint: /payment/generate-qr
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

// Upload slip - endpoint: /payment/upload-slip
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

module.exports = router; 