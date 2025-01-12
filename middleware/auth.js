// Middleware for checking if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
};

// Middleware for checking if user is admin
const isAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    
    next();
};

// Middleware for checking specific permissions
const hasPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user.permissions.includes(permission)) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        next();
    };
};

module.exports = {
    isAuthenticated,
    isAdmin,
    hasPermission
}; 