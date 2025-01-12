const mongoose = require('mongoose');

const scriptSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    imageUrl: String,
    features: [String],
    compatibility: String,
    instructions: String,
    shortDescription: String,
    category: String,
    version: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    downloadUrl: String,
    authEndpoint: String,
    resourceName: {
        type: String,
        required: true
    },
    versions: [{
        number: {
            type: String,
            required: true
        },
        downloadUrl: {
            type: String,
            required: true
        },
        changes: [String],
        releaseDate: {
            type: Date,
            default: Date.now
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    currentVersion: {
        type: String,
        default: '1.0.0'
    }
});

module.exports = mongoose.model('Script', scriptSchema); 