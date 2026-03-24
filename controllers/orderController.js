const mongoose = require('mongoose');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const ORDER_COST = 10; // Fixed cost per order

const createOrderWithoutTransaction = async ({ userId, fileName, fileUrl }) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const currentBalance = Number(user.walletBalance || 0);
    if (currentBalance < ORDER_COST) throw new Error('Insufficient funds');

    user.walletBalance = currentBalance - ORDER_COST;
    await user.save();

    await Transaction.create({
        user: user._id,
        amount: ORDER_COST,
        type: 'Debit',
        status: 'Success',
        reference: `ORD-${Date.now()}`,
        description: `Payment for Order: ${fileName}`
    });

    await Order.create({
        user: user._id,
        fileName,
        fileUrl,
        memberId: user.memberId,
        status: 'Pending'
    });
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
    const { fileName, fileUrl } = req.body;

    if (!fileName || !fileUrl) {
        res.status(400).json({ message: 'Please provide file name and URL' });
        return;
    }

    try {
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                const user = await User.findById(req.user._id).session(session);
                if (!user) throw new Error('User not found');

                const currentBalance = Number(user.walletBalance || 0);
                if (currentBalance < ORDER_COST) throw new Error('Insufficient funds');

                user.walletBalance = currentBalance - ORDER_COST;
                await user.save({ session });

                await Transaction.create([{
                    user: user._id,
                    amount: ORDER_COST,
                    type: 'Debit',
                    status: 'Success',
                    reference: `ORD-${Date.now()}`,
                    description: `Payment for Order: ${fileName}`
                }], { session });

                await Order.create([{
                    user: user._id,
                    fileName,
                    fileUrl,
                    memberId: user.memberId,
                    status: 'Pending'
                }], { session });
            });
        } finally {
            await session.endSession();
        }

        res.status(201).json({ message: 'Order created and paid successfully' });
    } catch (error) {
        const message = String(error?.message || '');
        const needsFallback = message.includes('Transaction numbers are only allowed') || message.includes('replica set');

        if (needsFallback) {
            try {
                await createOrderWithoutTransaction({ userId: req.user._id, fileName, fileUrl });
                return res.status(201).json({ message: 'Order created and paid successfully' });
            } catch (fallbackError) {
                const fallbackMessage = String(fallbackError?.message || '');
                if (fallbackMessage === 'Insufficient funds') {
                    return res.status(400).json({ message: 'Insufficient funds. Please add money to your wallet.' });
                }
                return res.status(500).json({ message: 'Server Error' });
            }
        }

        if (message === 'Insufficient funds') {
            return res.status(400).json({ message: 'Insufficient funds. Please add money to your wallet.' });
        }

        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all orders for logged in user
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .lean();
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders/all
// @access  Private (Admin)
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({})
            .sort({ createdAt: -1 })
            .lean();
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['Pending', 'Printing Completed', 'Improper', 'Dispatched'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        const order = await Order.findByIdAndUpdate(
            id,
            { status },
            { new: true, runValidators: true }
        ).lean();

        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.json({ message: 'Order status updated', status: order.status });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getRecentOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(10);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const searchOrderByOrderId = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId, user: req.user._id });
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createOrder,
    getRecentOrders,
    getOrderById,
    searchOrderByOrderId,
    getOrders,
    getAllOrders,
    updateOrderStatus
};
