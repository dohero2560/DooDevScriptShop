const express = require('express');
const router = express.Router();
const generatePayload = require('promptpay-qr');
const QRCode = require('qrcode');
const User = require('../models/User');
const Payment = require('../models/Payment');

const PROMPTPAY_ID = process.env.PROMPTPAY_NUMBER;
const PAYMENT_EXPIRY_MINUTES = 15;

// Function to format PromptPay number
function formatPromptPayNumber(number) {
    if (!number) return '';
    if (number.length === 10) {
        return number.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    return number;
}

// Function to format amount with random satang
function formatAmount(amount) {
    // สุ่มเศษสตางค์ระหว่าง 1-99
    const satang = Math.floor(Math.random() * 99) + 1;
    // รวมจำนวนเงินและเศษสตางค์
    const totalAmount = parseFloat(amount) + (satang / 100);
    
    console.log('Original amount:', amount);
    console.log('Random satang:', satang);
    console.log('Total amount with satang:', totalAmount.toFixed(2));
    
    return parseFloat(totalAmount.toFixed(2));
}

// Generate QR Code
router.post('/api/payments/generate-qr', async (req, res) => {
    try {
        if (!PROMPTPAY_ID) {
            return res.status(500).json({ error: 'PromptPay configuration is missing' });
        }

        let { amount } = req.body;
        amount = parseFloat(amount); // แปลงเป็นตัวเลขก่อน
        
        console.log('Received amount:', amount);
        
        if (!amount || amount < 1) {
            return res.status(400).json({ error: 'จำนวนเงินต้องมากกว่า 1 บาท' });
        }

        // แปลงจำนวนเงินให้มีเศษสตางค์
        const finalAmount = formatAmount(amount);
        console.log('Final amount with satang:', finalAmount);

        // สร้างข้อมูลการเติมเงิน
        const payment = new Payment({
            userId: req.user?._id || 'test-user', // เพิ่ม fallback สำหรับการทดสอบ
            amount: finalAmount,
            reference: Date.now().toString(),
            points: Math.floor(amount), // points เท่ากับจำนวนเงินที่ตั้งใจจะเติม (ไม่รวมเศษสตางค์)
            status: 'pending',
            expiresAt: new Date(Date.now() + (PAYMENT_EXPIRY_MINUTES * 60000))
        });
        await payment.save();

        // Generate PromptPay payload
        const payload = generatePayload(PROMPTPAY_ID, { amount: finalAmount });
        const qrCode = await QRCode.toDataURL(payload);

        const response = {
            success: true,
            qrCode,
            amount: finalAmount,
            originalAmount: amount,
            points: Math.floor(amount),
            reference: payment.reference,
            promptpayId: formatPromptPayNumber(PROMPTPAY_ID),
            expiresAt: payment.expiresAt
        };

        console.log('Sending response:', response);
        res.json(response);

    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ 
            error: 'ไม่สามารถสร้าง QR Code ได้',
            details: error.message 
        });
    }
});

// Verify payment (webhook endpoint)
router.post('/api/payments/verify', async (req, res) => {
    try {
        const { reference, amount } = req.body;

        const payment = await Payment.findOne({ reference });
        if (!payment) {
            return res.status(404).json({ error: 'ไม่พบรายการเติมเงิน' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ error: 'รายการนี้ถูกดำเนินการไปแล้ว' });
        }

        if (new Date() > payment.expiresAt) {
            payment.status = 'expired';
            await payment.save();
            return res.status(400).json({ error: 'QR Code หมดอายุแล้ว' });
        }

        // ตรวจสอบจำนวนเงิน
        if (parseFloat(amount) !== payment.amount) {
            payment.status = 'failed';
            await payment.save();
            return res.status(400).json({ error: 'จำนวนเงินไม่ถูกต้อง' });
        }

        // อัพเดทสถานะการชำระเงิน
        payment.status = 'completed';
        payment.completedAt = new Date();
        await payment.save();

        // เพิ่ม points ให้ user
        const user = await User.findById(payment.userId);
        if (!user) {
            return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้' });
        }

        const previousPoints = user.points;
        user.points += payment.points;
        await user.save();

        console.log(`Updated points for user ${user._id}: ${previousPoints} -> ${user.points}`);

        res.json({
            success: true,
            points: payment.points,
            newBalance: user.points
        });

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: 'ไม่สามารถยืนยันการชำระเงินได้' });
    }
});

// Check payment status
router.get('/api/payments/:reference/status', async (req, res) => {
    try {
        const payment = await Payment.findOne({ reference: req.params.reference });
        
        if (!payment) {
            return res.status(404).json({ error: 'ไม่พบรายการเติมเงิน' });
        }

        res.json({
            status: payment.status,
            amount: payment.amount,
            points: payment.points,
            expiresAt: payment.expiresAt
        });

    } catch (error) {
        console.error('Error checking status:', error);
        res.status(500).json({ error: 'ไม่สามารถตรวจสอบสถานะได้' });
    }
});

module.exports = router; 