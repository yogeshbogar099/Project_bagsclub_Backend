const { ROLES } = require('../config/permissions');
const User = require('../models/User');

// @desc    Get all users (Admin)
// @route   GET /api/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({})
            .select('name email memberId walletBalance role mobileNumber')
            .lean();
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user role (Super Admin)
// @route   PUT /api/users/:id/role
// @access  Private (Super Admin)
const updateUserRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!Object.values(ROLES).includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }

    try {
        const user = await User.findByIdAndUpdate(
            id,
            { role },
            { new: true, runValidators: true }
        ).select('name email memberId walletBalance role mobileNumber');

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({
            _id: String(user._id),
            name: user.name,
            email: user.email,
            memberId: user.memberId,
            walletBalance: user.walletBalance,
            role: user.role,
            mobileNumber: user.mobileNumber
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getAllUsers,
    updateUserRole
};
