require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const winston = require('winston');
const fetch = require('node-fetch');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(cors());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60 // เก็บ session 1 วัน
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 วัน
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    discordId: String,
    username: String,
    discriminator: String,
    email: String,
    avatar: String,
    points: { type: Number, default: 0 },
    cart: [{
        scriptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Script' },
        quantity: Number
    }],
    purchases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' }],
    isAdmin: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
    permissions: [{
        type: String,
        enum: ['manage_users', 'manage_scripts', 'manage_purchases', 'manage_points']
    }]
});

const User = mongoose.model('User', userSchema);

// Script Schema
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

const Script = mongoose.model('Script', scriptSchema);

// Purchase History Schema
const purchaseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scriptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Script' },
    license: { type: String, required: true },
    serverIP: { type: String, default: '' },
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
    resourceName: { type: String, default: '' },
    purchaseDate: {
        type: Date,
        default: Date.now
    }
});

const Purchase = mongoose.model('Purchase', purchaseSchema);

// Discord Authentication
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Discord Access Token:', accessToken);
        console.log('Bearer Token for Postman:', `Bearer ${accessToken}`);

        let user = await User.findOne({ discordId: profile.id });
        
        // แก้ไขการสร้าง avatarURL
        let avatarURL;
        if (profile.avatar) {
            // ตรวจสอบว่าเป็น GIF หรือไม่
            const isGif = profile.avatar.startsWith('a_');
            const extension = isGif ? 'gif' : 'png';
            avatarURL = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${extension}?size=128`;
        } else {
            // Default avatar based on discriminator
            const defaultIndex = profile.discriminator ? parseInt(profile.discriminator) % 5 : 0;
            avatarURL = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
        }

        console.log('Profile:', {
            id: profile.id,
            username: profile.username,
            avatar: profile.avatar,
            discriminator: profile.discriminator
        });
        console.log('Generated Avatar URL:', avatarURL);

        if (!user) {
            user = await User.create({
                discordId: profile.id,
                username: profile.username,
                discriminator: profile.discriminator,
                email: profile.email,
                avatar: avatarURL
            });
        } else {
            user.username = profile.username;
            user.discriminator = profile.discriminator;
            user.avatar = avatarURL;
            await user.save();
        }
        
        return done(null, user);
    } catch (err) {
        console.error('Discord Strategy Error:', err);
        return done(err, null);
    }
}));

// Serialize & Deserialize User
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Routes
app.get('/api/scripts', async (req, res) => {
    try {
        const scripts = await Script.find().select('name shortDescription price imageUrl resourceName');
        res.json(scripts);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching scripts' });
    }
});

app.get('/api/scripts/:id', async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) {
            return res.status(404).json({ error: 'Script not found' });
        }
        res.json(script);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching script details' });
    }
});

app.post('/api/cart/add', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { scriptId } = req.body;
    try {
        const user = await User.findById(req.user._id);
        const existingItem = user.cart.find(item => item.scriptId.toString() === scriptId);
        
        if (existingItem) {
            return res.status(400).json({ error: 'Item already in cart' });
        }
        
        user.cart.push({ scriptId, quantity: 1 });
        await user.save();
        
        // Populate cart items before sending response
        await user.populate('cart.scriptId');
        const cartItems = user.cart.map(item => ({
            scriptId: item.scriptId._id,
            quantity: item.quantity,
            name: item.scriptId.name,
            price: item.scriptId.price,
            imageUrl: item.scriptId.imageUrl
        }));
        
        res.json(cartItems);
    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).json({ error: 'Error adding to cart' });
    }
});

app.post('/api/cart/remove', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { scriptId } = req.body;
    try {
        const user = await User.findById(req.user._id);
        user.cart = user.cart.filter(item => item.scriptId.toString() !== scriptId);
        await user.save();

        // Populate cart items before sending response
        await user.populate('cart.scriptId');
        const cartItems = user.cart.map(item => ({
            scriptId: item.scriptId._id,
            quantity: item.quantity,
            name: item.scriptId.name,
            price: item.scriptId.price,
            imageUrl: item.scriptId.imageUrl
        }));
        
        res.json(cartItems);
    } catch (err) {
        console.error('Error removing from cart:', err);
        res.status(500).json({ error: 'Error removing from cart' });
    }
});

// Generate unique license key
function generateLicense() {
    return 'LS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Update checkout endpoint
app.post('/api/cart/checkout', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const user = await User.findById(req.user._id);
        let totalCost = 0;
        const purchases = [];
        
        // Calculate total cost and create purchases
        for (const item of user.cart) {
            const script = await Script.findById(item.scriptId);
            if (!script) {
                return res.status(404).json({ error: `Script ${item.scriptId} not found` });
            }
            totalCost += script.price * item.quantity;
            
            // Create purchase record with script's resourceName
            const purchase = new Purchase({
                userId: user._id,
                scriptId: script._id,
                price: script.price,
                license: generateLicense(),
                resourceName: script.resourceName
            });
            purchases.push(purchase);
        }
        
        // Check if user has enough points
        if (user.points < totalCost) {
            return res.status(400).json({ 
                error: 'Insufficient points',
                required: totalCost,
                current: user.points
            });
        }
        
        // Save purchases and update user
        for (const purchase of purchases) {
            await purchase.save();
            user.purchases.push(purchase._id);
        }
        
        // Deduct points and clear cart
        user.points -= totalCost;
        user.cart = [];
        await user.save();
        
        res.json({ 
            success: true, 
            remainingPoints: user.points,
            totalCost,
            purchases: purchases.map(p => ({
                _id: p._id,
                license: p.license,
                resourceName: p.resourceName
            }))
        });
    } catch (err) {
        console.error('Checkout error:', err);
        res.status(500).json({ error: 'Error during checkout' });
    }
});

// Get user's purchases
app.get('/api/purchases', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const purchases = await Purchase.find({ userId: req.user._id })
            .populate('scriptId')
            .sort({ purchaseDate: -1 });

        const purchasesWithDetails = purchases.map(purchase => ({
            _id: purchase._id,
            scriptId: {
                _id: purchase.scriptId._id,
                name: purchase.scriptId.name,
                downloadUrl: purchase.scriptId.downloadUrl
            },
            purchaseDate: purchase.purchaseDate,
            price: purchase.price,
            license: purchase.license,
            serverIP: purchase.serverIP || '0.0.0.0',
            resourceName: purchase.resourceName || '',
            status: purchase.status
        }));

        res.json(purchasesWithDetails);
    } catch (err) {
        console.error('Error fetching purchases:', err);
        res.status(500).json({ error: 'Error fetching purchase history' });
    }
});

// Utility function to validate IP address
function isValidIP(ip) {
    // IPv4 regex pattern
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Pattern.test(ip)) return false;
    
    // Check each octet
    const octets = ip.split('.');
    return octets.every(octet => {
        const num = parseInt(octet);
        return num >= 0 && num <= 255;
    });
}

// Add webhook function near the top of the file
async function sendDiscordWebhook(webhookUrl, content) {
    try {
        console.log('=== SENDING WEBHOOK ===');
        console.log('Webhook URL:', webhookUrl);
        console.log('Content:', JSON.stringify(content, null, 2));

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(content)
        });
        
        const responseText = await response.text();
        console.log('Webhook Response:', response.status, responseText);

        if (!response.ok) {
            console.error('Failed to send webhook:', responseText);
        } else {
            console.log('Webhook sent successfully!');
        }
    } catch (error) {
        console.error('Error in sendDiscordWebhook:', error);
    }
}

// เพิ่ม log ตรวจสอบ webhook URL ในส่วนที่เรียกใช้
if (process.env.DISCORD_WEBHOOK_URL) {
    console.log('Discord webhook URL is configured');
} else {
    console.log('Discord webhook URL is not configured');
}

// Update the verify-license endpoint
app.post('/api/verify-license', async (req, res) => {
    console.log('Starting license verification...');
    console.log('Webhook URL configured:', !!process.env.DISCORD_WEBHOOK_URL);
    
    const { license, serverIP, resourceName } = req.body;
    console.log('License Verification Request:', { license, serverIP, resourceName });

    if (!license || !serverIP || !resourceName) {
        console.log('Verification Failed: Missing required fields');
        return res.status(400).json({ 
            valid: false,
            error: 'License, Server IP, and Resource Name are required' 
        });
    }

    // Validate IP format
    if (!isValidIP(serverIP)) {
        console.log('Verification Failed: Invalid IP format -', serverIP);
        return res.status(400).json({
            valid: false,
            error: 'Invalid IP address format'
        });
    }

    try {
        const purchase = await Purchase.findOne({ 
            license,
            status: { $ne: 'revoked' }
        })
        .populate('scriptId')
        .populate('userId', 'username discriminator discordId');

        if (!purchase) {
            console.log('Attempting to send webhook for failed verification...');
            // Send webhook for failed verification
            if (process.env.DISCORD_WEBHOOK_URL) {
                console.log('Sending webhook for failed verification');
                await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, {
                    content: "License Verification Failed", // เพิ่ม content field
                    embeds: [{
                        title: '❌ License Verification Failed',
                        color: 0xFF0000,
                        fields: [
                            { name: 'License', value: license },
                            { name: 'Server IP', value: serverIP },
                            { name: 'Resource', value: resourceName },
                            { name: 'Reason', value: 'Invalid License' }
                        ],
                        timestamp: new Date().toISOString()
                    }]
                });
            } else {
                console.log('No webhook URL configured for failed verification');
            }

            return res.status(404).json({ 
                valid: false,
                error: 'Invalid license' 
            });
        }

        if (purchase.scriptId.resourceName !== resourceName) {
            console.log('Verification Failed: Resource name mismatch -', {
                expected: purchase.scriptId.resourceName,
                received: resourceName
            });
            
            // Send webhook for resource mismatch
            if (process.env.DISCORD_WEBHOOK_URL) {
                await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, {
                    embeds: [{
                        title: '⚠️ Resource Name Mismatch',
                        color: 0xFFA500,
                        fields: [
                            { name: 'License', value: license },
                            { name: 'Server IP', value: serverIP },
                            { name: 'Expected Resource', value: purchase.scriptId.resourceName },
                            { name: 'Received Resource', value: resourceName }
                        ],
                        timestamp: new Date().toISOString()
                    }]
                });
            }

            return res.status(403).json({ 
                valid: false,
                error: 'Invalid resource name for this license' 
            });
        }

        // IP check
        if (purchase.serverIP && purchase.serverIP !== serverIP) {
            console.log('Verification Failed: IP mismatch -', {
                stored: purchase.serverIP,
                received: serverIP
            });
            
            // Send webhook for IP mismatch
            if (process.env.DISCORD_WEBHOOK_URL) {
                await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, {
                    embeds: [{
                        title: '🚫 IP Address Mismatch',
                        color: 0xFF0000,
                        fields: [
                            { name: 'License', value: license },
                            { name: 'Stored IP', value: purchase.serverIP },
                            { name: 'Attempted IP', value: serverIP },
                            { name: 'Resource', value: resourceName },
                            { name: 'User', value: `${purchase.userId.username}#${purchase.userId.discriminator}` }
                        ],
                        timestamp: new Date().toISOString()
                    }]
                });
            }

            return res.status(403).json({
                valid: false,
                error: 'IP address mismatch. License is bound to a different server.'
            });
        }

        // Update serverIP if not set
        if (!purchase.serverIP) {
            purchase.serverIP = serverIP;
            await purchase.save();
            console.log('New IP registered:', {
                license,
                serverIP,
                user: `${purchase.userId.username}#${purchase.userId.discriminator}`
            });
            
            // Send webhook for new IP registration
            if (process.env.DISCORD_WEBHOOK_URL) {
                await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, {
                    embeds: [{
                        title: '✅ New IP Registered',
                        color: 0x00FF00,
                        fields: [
                            { name: 'License', value: license },
                            { name: 'Server IP', value: serverIP },
                            { name: 'Resource', value: resourceName },
                            { name: 'User', value: `${purchase.userId.username}#${purchase.userId.discriminator}` }
                        ],
                        timestamp: new Date().toISOString()
                    }]
                });
            }
        }

        console.log('Verification Successful:', {
            license,
            serverIP,
            user: `${purchase.userId.username}#${purchase.userId.discriminator}`,
            resource: resourceName
        });

        // เพิ่ม webhook สำหรับการยืนยันสำเร็จ
        if (process.env.DISCORD_WEBHOOK_URL) {
            console.log('Sending webhook for successful verification');
            await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, {
                content: "License Verification Successful", // เพิ่ม content field
                embeds: [{
                    title: '✅ License Verification Successful',
                    color: 0x00FF00,
                    fields: [
                        { name: 'License', value: license },
                        { name: 'Server IP', value: serverIP },
                        { name: 'Resource', value: resourceName },
                        { name: 'User', value: `${purchase.userId.username}#${purchase.userId.discriminator}` }
                    ],
                    timestamp: new Date().toISOString()
                }]
            });
        } else {
            console.log('No webhook URL configured for successful verification');
        }

        res.json({ 
            valid: true,
            message: 'License verified successfully',
            serverIP: purchase.serverIP,
            user: {
                username: purchase.userId.username,
                discriminator: purchase.userId.discriminator,
                discordId: purchase.userId.discordId
            }
        });
    } catch (err) {
        console.error('License verification error:', err);
        
        if (process.env.DISCORD_WEBHOOK_URL) {
            console.log('Sending webhook for verification error');
            await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, {
                content: "License Verification Error", // เพิ่ม content field
                embeds: [{
                    title: '⚠️ Verification Error',
                    color: 0xFF0000,
                    fields: [
                        { name: 'License', value: license },
                        { name: 'Server IP', value: serverIP },
                        { name: 'Resource', value: resourceName },
                        { name: 'Error', value: err.message }
                    ],
                    timestamp: new Date().toISOString()
                }]
            });
        } else {
            console.log('No webhook URL configured for error notification');
        }

        res.status(500).json({ 
            valid: false,
            error: 'Error verifying license' 
        });
    }
});

// Add new endpoint to check license status
app.get('/api/license-status/:license', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const purchase = await Purchase.findOne({ 
            license: req.params.license,
            userId: req.user._id
        });

        if (!purchase) {
            return res.status(404).json({ error: 'License not found' });
        }

        res.json({
            license: purchase.license,
            serverIP: purchase.serverIP || 'Not set',
            status: purchase.status || 'active',
            purchaseDate: purchase.purchaseDate
        });
    } catch (err) {
        console.error('Error checking license status:', err);
        res.status(500).json({ error: 'Error checking license status' });
    }
});

// Discord Authentication Routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', 
    passport.authenticate('discord', {
        failureRedirect: '/'
    }), 
    (req, res) => {
        res.redirect('/');
    }
);

// Logout Route
app.get('/auth/logout', (req, res) => {
    // Call req.logout() with a callback
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/?error=logout_failed');
        }
        
        // Then destroy session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
                return res.redirect('/?error=logout_failed');
            }
            
            // Clear cookie
            res.clearCookie('connect.sid');
            
            // Redirect to home page
            res.redirect('/');
        });
    });
});

// Get current user
app.get('/api/user', (req, res) => {
    if (req.user) {
        res.json({
            loggedIn: true,
            user: {
                id: req.user._id,
                username: req.user.username,
                avatar: req.user.avatar,
                points: req.user.points,
                isAdmin: req.user.isAdmin,
                role: req.user.role,
                permissions: req.user.permissions
            }
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// Get user points
app.get('/api/user/points', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ points: user.points });
    } catch (err) {
        console.error('Error fetching points:', err);
        res.status(500).json({ error: 'Error fetching points' });
    }
});

// Add points to user
app.post('/api/user/points/add', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { amount } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.points = (user.points || 0) + Number(amount);
        await user.save();
        
        res.json({ 
            success: true,
            points: user.points,
            added: amount
        });
    } catch (err) {
        console.error('Error adding points:', err);
        res.status(500).json({ error: 'Failed to add points' });
    }
});

// Route สำหรับเพิ่มสคริปต์ใหม่
app.post('/api/scripts', async (req, res) => {
    try {
        // ตรวจสอบว่ามี resourceName หรือไม่
        if (!req.body.resourceName) {
            return res.status(400).json({ error: 'Resource Name is required' });
        }

        const newScript = new Script({
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            imageUrl: req.body.imageUrl,
            features: req.body.features,
            compatibility: req.body.compatibility,
            instructions: req.body.instructions,
            shortDescription: req.body.shortDescription,
            category: req.body.category,
            version: req.body.version,
            downloadUrl: req.body.downloadUrl,
            authEndpoint: req.body.authEndpoint,
            resourceName: req.body.resourceName // กำหนด resourceName
        });

        await newScript.save();
        res.status(201).json(newScript);
    } catch (err) {
        console.error('Error adding script:', err);
        res.status(500).json({ error: 'Error adding script' });
    }
});

// Route สำหรับอัพเดทสคริปต์
app.put('/api/scripts/:id', async (req, res) => {
    try {
        // ตรวจสอบว่ามี resourceName หรือไม่
        if (!req.body.resourceName) {
            return res.status(400).json({ error: 'Resource Name is required' });
        }

        const updatedScript = await Script.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                resourceName: req.body.resourceName // อัพเดท resourceName
            },
            { new: true }
        );

        if (!updatedScript) {
            return res.status(404).json({ error: 'Script not found' });
        }

        res.json(updatedScript);
    } catch (err) {
        console.error('Error updating script:', err);
        res.status(500).json({ error: 'Error updating script' });
    }
});

// Route สำหรับลบสคริปต์
app.delete('/api/scripts/:id', async (req, res) => {
    try {
        const result = await Script.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'Script not found' });
        }
        res.json({ message: 'Script deleted successfully' });
    } catch (err) {
        console.error('Error deleting script:', err);
        res.status(500).json({ error: 'Error deleting script' });
    }
});

// Route สำหรับลบสคริปต์ทั้งหมด (ใช้ระวังในโปรดักชัน)
app.delete('/api/scripts', async (req, res) => {
    try {
        await Script.deleteMany({});
        res.json({ message: 'All scripts deleted successfully' });
    } catch (err) {
        console.error('Error deleting all scripts:', err);
        res.status(500).json({ error: 'Error deleting all scripts' });
    }
});

// Cart Routes
app.get('/api/cart', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        const user = await User.findById(req.user._id).populate('cart.scriptId');
        const cartItems = user.cart.map(item => ({
            scriptId: item.scriptId._id,
            quantity: item.quantity,
            name: item.scriptId.name,
            price: item.scriptId.price,
            imageUrl: item.scriptId.imageUrl
        }));
        res.json(cartItems);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching cart' });
    }
});

// Route สำหรับดึงข้อมูล purchase
app.get('/api/purchases/:purchaseId', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const purchase = await Purchase.findOne({
            _id: req.params.purchaseId,
            userId: req.user._id
        });

        if (!purchase) {
            return res.status(404).json({ error: 'Purchase not found' });
        }

        res.json({
            _id: purchase._id,
            serverIP: purchase.serverIP,
            resourceName: purchase.resourceName,
            license: purchase.license
        });
    } catch (err) {
        console.error('Error fetching purchase:', err);
        res.status(500).json({ error: 'Error fetching purchase details' });
    }
});

// Update server IP endpoint
app.post('/api/purchases/:purchaseId/server-ip', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { purchaseId } = req.params;
    const { serverIP } = req.body;

    if (!serverIP || !serverIP.trim()) {
        return res.status(400).json({ error: 'Server IP is required' });
    }

    try {
        const purchase = await Purchase.findOne({
            _id: purchaseId,
            userId: req.user._id
        });

        if (!purchase) {
            return res.status(404).json({ error: 'Purchase not found' });
        }

        // อัพเดท Server IP โดยไม่ต้องเช็คว่าเคยตั้งค่าแล้วหรือไม่
        purchase.serverIP = serverIP.trim();
        await purchase.save();

        res.json({
            success: true,
            serverIP: purchase.serverIP,
            message: 'Server IP updated successfully'
        });
    } catch (err) {
        console.error('Error updating server IP:', err);
        res.status(500).json({ error: 'Error updating server IP' });
    }
});

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

// Admin Routes
app.post('/api/admin/create', isAdmin, async (req, res) => {
    try {
        const { discordId, role, permissions } = req.body;
        
        const user = await User.findOne({ discordId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.isAdmin = true;
        user.role = role;
        user.permissions = permissions;
        await user.save();

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                permissions: user.permissions
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Error creating admin' });
    }
});

app.get('/api/admin/users', isAdmin, hasPermission('manage_users'), async (req, res) => {
    try {
        const users = await User.find()
            .select('username discordId email points isAdmin role permissions');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching users' });
    }
});

app.put('/api/admin/users/:userId', isAdmin, hasPermission('manage_users'), async (req, res) => {
    try {
        const { role, permissions, points } = req.body;
        
        // กำหนดค่า isAdmin ตาม role โดยตรง
        const isAdmin = role === 'admin' || role === 'superadmin';
        
        // สร้าง update object
        const updateData = {
            $set: {
                role,
                permissions,
                points: Number(points),
                isAdmin // กำหนดค่า isAdmin ตาม role
            }
        };

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            updateData,
            { 
                new: true,
                runValidators: true 
            }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // ตรวจสอบและปรับปรุงสิทธิ์ตาม role
        if (role === 'user') {
            user.permissions = []; // ล้างสิทธิ์ทั้งหมดสำหรับ user ปกติ
        } else if (role === 'admin' || role === 'superadmin') {
            // ตรวจสอบว่ามีสิทธิ์พื้นฐานครบหรือไม่
            const basicPermissions = ['manage_users', 'manage_scripts', 'manage_purchases', 'manage_points'];
            const newPermissions = new Set([...permissions, ...basicPermissions]);
            user.permissions = Array.from(newPermissions);
        }

        await user.save(); // บันทึกการเปลี่ยนแปลง

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                permissions: user.permissions,
                points: user.points,
                isAdmin: user.isAdmin
            }
        });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ error: 'Error updating user' });
    }
});

app.delete('/api/admin/users/:userId/admin', isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.isAdmin = false;
        user.role = 'user';
        user.permissions = [];
        await user.save();

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error removing admin status' });
    }
});

// Admin Routes
app.post('/api/admin/scripts', isAdmin, async (req, res) => {
    try {
        const newScript = new Script(req.body);
        await newScript.save();
        res.status(201).json(newScript);
    } catch (err) {
        res.status(500).json({ error: 'Error creating script' });
    }
});

app.put('/api/admin/scripts/:id', isAdmin, async (req, res) => {
    try {
        const script = await Script.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(script);
    } catch (err) {
        res.status(500).json({ error: 'Error updating script' });
    }
});

app.delete('/api/admin/scripts/:id', isAdmin, async (req, res) => {
    try {
        await Script.findByIdAndDelete(req.params.id);
        res.json({ message: 'Script deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting script' });
    }
});

app.get('/api/admin/users/:userId', isAdmin, hasPermission('manage_users'), async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('username discordId email points isAdmin role permissions');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (err) {
        console.error('Error fetching user details:', err);
        res.status(500).json({ error: 'Error fetching user details' });
    }
});

// เพิ่ม route นี้ไว้ที่ส่วนของ Admin Routes
app.post('/api/admin/init', async (req, res) => {
    try {
        const { discordId, secretKey } = req.body;
        
        // ตรวจสอบ secret key จาก environment variable
        if (secretKey !== process.env.ADMIN_SECRET_KEY) {
            return res.status(403).json({ error: 'Invalid secret key' });
        }

        const user = await User.findOne({ discordId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // ตั้งค่าเป็น admin
        user.isAdmin = true;
        user.role = 'admin';
        user.permissions = ['manage_users', 'manage_scripts', 'manage_purchases', 'manage_points'];
        await user.save();

        res.json({
            success: true,
            message: 'Admin initialized successfully',
            user: {
                username: user.username,
                role: user.role,
                permissions: user.permissions
            }
        });
    } catch (err) {
        console.error('Error initializing admin:', err);
        res.status(500).json({ error: 'Error initializing admin' });
    }
});

// เพิ่ม route นี้เพื่อตรวจสอบค่า env (อย่าลืมลบออกในโปรดักชัน)
app.get('/api/check-env', (req, res) => {
    res.json({
        hasAdminKey: !!process.env.ADMIN_SECRET_KEY,
        adminKeyLength: process.env.ADMIN_SECRET_KEY?.length
    });
});

// เพิ่มเวอร์ชันใหม่
app.post('/api/admin/scripts/:scriptId/versions', isAdmin, async (req, res) => {
    try {
        const script = await Script.findById(req.params.scriptId);
        if (!script) {
            return res.status(404).json({ error: 'Script not found' });
        }

        const { version } = req.body;
        
        // ตรวจสอบว่าเวอร์ชันซ้ำหรือไม่
        const versionExists = script.versions.some(v => v.number === version.number);
        if (versionExists) {
            return res.status(400).json({ error: 'Version already exists' });
        }

        // เพิ่มเวอร์ชันใหม่
        script.versions.push({
            number: version.number,
            downloadUrl: version.downloadUrl,
            changes: version.changes,
            releaseDate: new Date(),
            isActive: true
        });

        // อัพเดท currentVersion ถ้าเป็นเวอร์ชันแรก
        if (!script.currentVersion) {
            script.currentVersion = version.number;
        }

        await script.save();
        res.json(script);
    } catch (err) {
        console.error('Error adding version:', err);
        res.status(500).json({ error: 'Error adding version' });
    }
});

// อัพเดทเวอร์ชันที่มีอยู่
app.put('/api/admin/scripts/:scriptId/versions/:versionNumber', isAdmin, async (req, res) => {
    try {
        const script = await Script.findById(req.params.scriptId);
        if (!script) {
            return res.status(404).json({ error: 'Script not found' });
        }

        const versionIndex = script.versions.findIndex(
            v => v.number === req.params.versionNumber
        );

        if (versionIndex === -1) {
            return res.status(404).json({ error: 'Version not found' });
        }

        // อัพเดทข้อมูลเวอร์ชัน
        Object.assign(script.versions[versionIndex], req.body);
        await script.save();

        res.json(script);
    } catch (err) {
        console.error('Error updating version:', err);
        res.status(500).json({ error: 'Error updating version' });
    }
});

// ลบเวอร์ชัน (soft delete)
app.delete('/api/admin/scripts/:scriptId/versions/:versionNumber', isAdmin, async (req, res) => {
    try {
        const script = await Script.findById(req.params.scriptId);
        if (!script) {
            return res.status(404).json({ error: 'Script not found' });
        }

        const version = script.versions.find(v => v.number === req.params.versionNumber);
        if (!version) {
            return res.status(404).json({ error: 'Version not found' });
        }

        // Soft delete โดยการตั้งค่า isActive เป็น false
        version.isActive = false;
        await script.save();

        res.json({ message: 'Version deactivated successfully' });
    } catch (err) {
        console.error('Error deactivating version:', err);
        res.status(500).json({ error: 'Error deactivating version' });
    }
});

// ดึงข้อมูลเวอร์ชันทั้งหมด
app.get('/api/admin/scripts/:scriptId/versions', isAdmin, async (req, res) => {
    try {
        const script = await Script.findById(req.params.scriptId);
        if (!script) {
            return res.status(404).json({ error: 'Script not found' });
        }

        res.json(script.versions);
    } catch (err) {
        console.error('Error fetching versions:', err);
        res.status(500).json({ error: 'Error fetching versions' });
    }
});

// Admin Scripts Route
app.get('/api/admin/scripts', isAdmin, async (req, res) => {
    try {
        const scripts = await Script.find().select('name category price currentVersion');
        res.json(scripts);
    } catch (err) {
        console.error('Error fetching admin scripts:', err);
        res.status(500).json({ error: 'Error fetching scripts' });
    }
});

// Admin purchase management routes
app.get('/api/admin/purchases', isAdmin, async (req, res) => {
    try {
        const purchases = await Purchase.find()
            .populate('userId', 'username discordId')
            .populate('scriptId', 'name')
            .sort({ purchaseDate: -1 });
        res.json(purchases);
    } catch (err) {
        console.error('Error fetching purchases:', err);
        res.status(500).json({ error: 'Error fetching purchases' });
    }
});

app.put('/api/admin/purchases/:id', isAdmin, async (req, res) => {
    try {
        const { license, serverIP, status } = req.body;
        const purchase = await Purchase.findByIdAndUpdate(
            req.params.id,
            { 
                license,
                serverIP,
                status,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!purchase) {
            return res.status(404).json({ error: 'Purchase not found' });
        }

        res.json(purchase);
    } catch (err) {
        console.error('Error updating purchase:', err);
        res.status(500).json({ error: 'Error updating purchase' });
    }
});

app.get('/api/admin/purchases/:id', isAdmin, async (req, res) => {
    try {
        const purchase = await Purchase.findById(req.params.id)
            .populate('userId', 'username discordId')
            .populate('scriptId', 'name');
        if (!purchase) {
            return res.status(404).json({ error: 'Purchase not found' });
        }
        res.json(purchase);
    } catch (err) {
        console.error('Error fetching purchase details:', err);
        res.status(500).json({ error: 'Error fetching purchase details' });
    }
});

// Add this middleware for token verification
const verifyToken = async (req, res, next) => {
    try {
        const bearerHeader = req.headers['authorization'];
        if (!bearerHeader) {
            console.log('No Bearer token provided');
            return res.status(401).json({ error: 'No token provided' });
        }

        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        console.log('Received Bearer Token:', bearerToken);

        // ตรวจสอบ token กับ Discord API
        const response = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${bearerToken}`
            }
        });

        if (!response.ok) {
            console.log('Invalid token');
            return res.status(401).json({ error: 'Invalid token' });
        }

        const userData = await response.json();
        console.log('Verified Discord User:', userData);
        
        req.user = userData;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ error: 'Token verification failed' });
    }
};

// Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Log all requests
app.use((req, res, next) => {
    logger.info({
        method: req.method,
        path: req.path,
        ip: req.ip
    });
    next();
});