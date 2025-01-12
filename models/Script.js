const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
    number: { 
        type: String, 
        required: true 
    },
    releaseDate: { 
        type: Date, 
        default: Date.now 
    },
    changes: [String],
    downloadUrl: { 
        type: String, 
        required: true 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    }
});

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
    versions: [versionSchema],
    currentVersion: { 
        type: String,
        required: true 
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    resourceName: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Script', scriptSchema); 