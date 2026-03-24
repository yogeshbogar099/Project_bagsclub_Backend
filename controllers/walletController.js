const Transaction = require('../models/Transaction');
const User = require('../models/User');

// @desc    Add money (Simulate)
// @route   POST /api/wallet/add
// @access  Private
const addMoney = async (req, res) => {
    const { amount, reference, description } = req.body;

    if (!amount || amount <= 0) {
        res.status(400).json({ message: 'Invalid amount' });
        return;
    }

    if (!reference) {
        return res.status(400).json({ message: 'Transaction reference required' });
    }

    try {
        // Prevent duplicate transaction processing
        const existingTx = await Transaction.findOne({ reference });
        if (existingTx) {
            return res.status(400).json({ message: 'Transaction already processed' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const txDoc = await Transaction.create({
            user: user._id,
            amount: Number(amount),
            type: 'Credit',
            status: 'Success',
            reference: reference,
            description: description || 'Wallet Top-up'
        });

        user.walletBalance = Number(user.walletBalance || 0) + Number(amount);
        await user.save();

        res.json({
            message: 'Money added successfully',
            newBalance: user.walletBalance,
            transaction: {
                _id: String(txDoc._id),
                user: String(txDoc.user),
                amount: txDoc.amount,
                type: txDoc.type,
                status: txDoc.status,
                reference: txDoc.reference,
                description: txDoc.description,
                createdAt: txDoc.createdAt
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get wallet transactions
// @route   GET /api/wallet/transactions
// @access  Private
const getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .lean();
        res.json(transactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get wallet balance
// @route   GET /api/wallet/balance
// @access  Private
const getBalance = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('walletBalance').lean();
        res.json({ balance: Number(user?.walletBalance || 0) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all transactions (Admin)
// @route   GET /api/wallet/admin/transactions
// @access  Private (Admin)
const getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        res.json(transactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get specific user wallet details (Admin)
// @route   GET /api/wallet/admin/user/:memberId
// @access  Private (Admin)
const getUserWalletDetails = async (req, res) => {
    const { memberId } = req.params;
    try {
        const user = await User.findOne({ memberId }).lean();
        if (!user) return res.status(404).json({ message: 'User not found' });

        const transactions = await Transaction.find({ user: user._id })
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            user: {
                _id: String(user._id),
                name: user.name,
                email: user.email,
                memberId: user.memberId,
                walletBalance: user.walletBalance || 0
            },
            transactions
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    addMoney,
    getTransactions,
    getBalance,
    getAllTransactions,
    getUserWalletDetails
};
