const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  reference: {
    type: String,
    required: true,
    unique: true
  },
  qrCode: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Automatically delete after 1 hour if not completed
  }
});

module.exports = mongoose.model('Payment', paymentSchema); 