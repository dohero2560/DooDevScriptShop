const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'view']
  },
  entityType: {
    type: String,
    required: true,
    enum: ['user', 'script', 'purchase', 'points']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changes: {
    before: Object,
    after: Object
  },
  metadata: {
    path: String,
    method: String
  },
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Log', logSchema); 