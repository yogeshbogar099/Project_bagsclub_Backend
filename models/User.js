const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/permissions');

const userSchema = mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { 
        type: String, 
        required: function() { return !this.googleId; } // Password required only if googleId is not present
    },
    googleId: { type: String, unique: true, sparse: true }, // Sparse allows multiple nulls
    memberId: { type: String, unique: true, sparse: true },
    walletBalance: { type: Number, default: 0 },
    mobileNumber: { type: String, unique: true, sparse: true },
    businessName: { type: String },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    address: { type: String },
    pinCode: { type: String },
    gstNumber: { type: String },
    gst: { type: String }, // Keep for legacy data
    staffContactNumber: { type: String },
    staffContact: { type: String }, // Keep for legacy data
    reference: { type: String },
    services: {
        printing: { type: Boolean, default: false },
        exhibition: { type: Boolean, default: false },
        magazine: { type: Boolean, default: false },
        magazineAd: { type: Boolean, default: false }
    },
    role: { 
        type: String, 
        enum: Object.values(ROLES), 
        default: ROLES.ASSOCIATE_MEMBER,
        index: true 
    },
    isSuspended: { type: Boolean, default: false }
}, { timestamps: true });

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
    if (!this.password) {
        console.log('No password set for user', this.email);
        return false;
    }
    try {
        console.log('Comparing passwords for user:', this.email);
        const isMatch = await bcrypt.compare(enteredPassword, this.password);
        console.log('Bcrypt comparison result:', isMatch);
        return isMatch;
    } catch (error) {
        console.error('Bcrypt comparison error:', error);
        throw error;
    }
};

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
    if (!this.isModified('password') || !this.password) {
        console.log('Password not modified or not present for user:', this.email);
        return next();
    }
    try {
        console.log('Hashing password for user:', this.email);
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        console.log('Password hashed successfully for user:', this.email);
        next();
    } catch (error) {
        console.error('Password hashing error:', error);
        next(error);
    }
});

module.exports = mongoose.model('User', userSchema);
