const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const { ROLE_PERMISSIONS, ROLES } = require('../config/permissions');
const User = require('../models/User');

const ensureDbReady = (res) => {
    if (mongoose.connection.readyState === 1) return true;
    res.status(503).json({ message: 'Database unavailable' });
    return false;
};

const handleAuthError = (res, error) => {
    console.error('Auth Error Triggered:', error);
    if (error?.code === 11000) {
        return res.status(400).json({ message: 'User already exists (Email or Mobile already registered)' });
    }
    if (error?.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ message: messages.join(', ') });
    }
    if (error?.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid input format' });
    }
    const msg = String(error?.message || '');
    if (msg.includes('buffering timed out') || msg.includes('Server selection timed out')) {
        return res.status(503).json({ message: 'Database unavailable' });
    }
    return res.status(500).json({ 
        message: 'Internal server error', 
        error: process.env.NODE_ENV === 'production' ? null : msg 
    });
};

const generateMemberId = async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
        const memberId = `MEM${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;
        const exists = await User.exists({ memberId });
        if (!exists) return memberId;
    }
    return `MEM${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100000)}`;
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        console.log('Login attempt:', req.body); // LOG 1: Request Body
        if (!ensureDbReady(res)) return;

        const { email, mobile, password } = req.body;
        const identifier = (email || '').trim().toLowerCase();
        const mobileNumber = (mobile || '').trim();

        if ((!identifier && !mobileNumber) || !password) {
            console.log('Login failed: Missing credentials');
            return res.status(400).json({ message: 'Missing credentials' });
        }

        const user = await User.findOne(identifier ? { email: identifier } : { mobileNumber });
        console.log('User found in DB:', user ? `Yes (${user.email})` : 'No'); // LOG 2: DB Result

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (user.isSuspended) {
            console.log('Login failed: Account suspended', user.email);
            return res.status(403).json({ message: 'Account suspended' });
        }

        const ok = await user.matchPassword(password);
        console.log('Bcrypt password match result:', ok); // LOG 3: Bcrypt Result

        if (!ok) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        generateRefreshToken(res, String(user._id));
        const accessToken = generateAccessToken(String(user._id));
        const capabilities = ROLE_PERMISSIONS[user.role] || [];

        console.log('Login successful, generating tokens for:', user.email); // LOG 4: JWT Generation start

        res.json({
            _id: String(user._id),
            name: user.name,
            email: user.email,
            memberId: user.memberId,
            walletBalance: user.walletBalance,
            role: user.role,
            mobileNumber: user.mobileNumber,
            businessName: user.businessName,
            country: user.country,
            state: user.state,
            city: user.city,
            address: user.address,
            pinCode: user.pinCode,
            gstNumber: user.gstNumber || user.gst,
            staffContactNumber: user.staffContactNumber || user.staffContact,
            capabilities,
            accessToken
        });
    } catch (error) {
        console.error('Login error detail:', error); // Exact backend error
        return handleAuthError(res, error);
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        console.log('Register attempt:', req.body); // LOG 1: Request Body
        if (!ensureDbReady(res)) return;

        const {
            name,
            email,
            password,
            mobile,
            businessName,
            country,
            address,
            pinCode,
            gst,
            reference,
            services
        } = req.body;

        if (!name || !email || !password) {
            console.log('Register failed: Missing required fields');
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const mobileNumber = String(mobile || '').trim() || undefined;

        const existing = await User.exists({
            $or: [
                { email: normalizedEmail },
                ...(mobileNumber ? [{ mobileNumber }] : [])
            ]
        });
        console.log('User already exists in DB:', !!existing); // LOG 2: DB Result

        if (existing) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const memberId = await generateMemberId();
        console.log('Generated memberId:', memberId);

        const user = await User.create({
            name,
            email: normalizedEmail,
            password,
            role: ROLES.ASSOCIATE_MEMBER,
            memberId,
            walletBalance: 0,
            mobileNumber,
            businessName: businessName || '',
            country: country || '',
            address: address || '',
            pinCode: pinCode || '',
            gst: gst || '',
            reference: reference || '',
            services: services || {}
        });
        console.log('User saved successfully:', user.email); // LOG 3: Mongo Save Result

        generateRefreshToken(res, String(user._id));
        const accessToken = generateAccessToken(String(user._id));
        const capabilities = ROLE_PERMISSIONS[user.role] || [];

        console.log('Registration successful, generating tokens for:', user.email); // LOG 4: JWT Generation

        res.status(201).json({
            _id: String(user._id),
            name: user.name,
            email: user.email,
            memberId: user.memberId,
            walletBalance: user.walletBalance,
            role: user.role,
            mobileNumber: user.mobileNumber,
            businessName: user.businessName,
            country: user.country,
            state: user.state,
            city: user.city,
            address: user.address,
            pinCode: user.pinCode,
            gstNumber: user.gstNumber || user.gst,
            staffContactNumber: user.staffContactNumber || user.staffContact,
            capabilities,
            accessToken
        });
    } catch (error) {
        console.error('Registration error detail:', error); // Exact backend error
        return handleAuthError(res, error);
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).json({ message: 'Logged out' });
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        if (!ensureDbReady(res)) return;

        const user = await User.findById(req.user._id).lean();
        if (!user) return res.status(404).json({ message: 'User not found' });
        const capabilities = ROLE_PERMISSIONS[user.role] || [];
        res.json({
            _id: String(user._id),
            name: user.name,
            email: user.email,
            memberId: user.memberId,
            walletBalance: user.walletBalance,
            role: user.role,
            mobileNumber: user.mobileNumber,
            businessName: user.businessName,
            country: user.country,
            state: user.state,
            city: user.city,
            address: user.address,
            pinCode: user.pinCode,
            gstNumber: user.gstNumber || user.gst,
            staffContactNumber: user.staffContactNumber || user.staffContact,
            reference: user.reference,
            services: user.services,
            capabilities
        });
    } catch (error) {
        return handleAuthError(res, error);
    }
};

// @desc    Refresh Access Token
// @route   POST /api/auth/refresh
// @access  Public (Cookie based)
const refreshToken = async (req, res) => {
    if (!ensureDbReady(res)) return;

    const token = req.cookies.jwt;

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id).lean();
        if (!user) return res.status(401).json({ message: 'Not authorized, user not found' });
        if (user.isSuspended) {
            return res.status(403).json({ message: 'Account suspended' });
        }

        const accessToken = generateAccessToken(String(user._id));
        const capabilities = ROLE_PERMISSIONS[user.role] || [];

        res.json({
            accessToken,
            _id: String(user._id),
            name: user.name,
            email: user.email,
            memberId: user.memberId,
            walletBalance: user.walletBalance,
            role: user.role,
            mobileNumber: user.mobileNumber,
            capabilities
        });

    } catch (error) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
    try {
        if (!ensureDbReady(res)) return;

        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Missing fields' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const ok = await user.matchPassword(oldPassword);
        if (!ok) return res.status(400).json({ message: 'Old password is incorrect' });

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password updated' });
    } catch (error) {
        return handleAuthError(res, error);
    }
};


module.exports = {
    loginUser,
    registerUser,
    logoutUser,
    getUserProfile,
    refreshToken,
    changePassword
};
