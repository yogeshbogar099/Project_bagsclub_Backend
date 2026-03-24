const jwt = require('jsonwebtoken');
const { ROLE_PERMISSIONS } = require('../config/permissions');
const User = require('../models/User');

const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer') ? authHeader.split(' ')[1] : null;
    const token = bearerToken;

    if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).lean();

        if (!user) return res.status(401).json({ message: 'Not authorized, user not found' });
        if (user.isSuspended) return res.status(403).json({ message: 'Account suspended' });

        req.user = { ...user, _id: String(user._id) };
        req.user.capabilities = ROLE_PERMISSIONS[user.role] || [];

        next();
    } catch (error) {
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

const checkCapability = (capability) => {
    return (req, res, next) => {
        if (req.user && req.user.capabilities.includes(capability)) {
            next();
        } else {
            res.status(403).json({ message: 'Not authorized, missing capability' });
        }
    };
};

module.exports = { protect, checkCapability };
