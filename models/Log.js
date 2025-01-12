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
    enum: ['user', 'script', 'purchase', 'points', 'license']
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
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    changedFields: [String]
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  userAgent: String
});

// ดัชนีเพื่อการค้นหาที่เร็วขึ้น
logSchema.index({ action: 1, entityType: 1 });
logSchema.index({ timestamp: -1 });
logSchema.index({ adminId: 1 });
logSchema.index({ entityId: 1 });

module.exports = mongoose.model('Log', logSchema); 