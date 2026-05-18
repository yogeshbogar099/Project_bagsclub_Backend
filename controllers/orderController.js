const mongoose = require('mongoose');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const ORDER_COST = 10; // Fixed cost per order

const ensureDbReady = (res) => {
    if (mongoose.connection.readyState === 1) return true;
    res.status(503).json({ message: 'Database unavailable' });
    return false;
};

const handleOrderError = (res, error) => {
    if (error?.code === 11000) {
        return res.status(409).json({ message: 'Duplicate key error' });
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
    const safeMessage = msg && msg.length <= 200 ? msg : 'Server Error';
    return res.status(500).json({ 
        message: safeMessage,
        code: 'ORDER_SERVER_ERROR',
        error: process.env.NODE_ENV === 'production' ? null : msg 
    });
};

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
    if (!ensureDbReady(res)) return;

    // Safety check for req.body
    if (!req.body || Object.keys(req.body).length === 0) {
        // If req.body is empty, it might be because of a parsing error (e.g. multipart boundary missing)
        // or the client sent an empty request.
        console.error('Order creation failed: req.body is empty or undefined.', {
            headers: req.headers,
            hasFile: !!req.file
        });
        return res.status(400).json({ 
            success: false,
            message: 'Request body is missing or could not be parsed. Ensure you are sending valid form data or JSON.' 
        });
    }

    const { 
        orderName,
        orderType, 
        bagType, // Support both names from different client pages
        quantity, 
        bagSize, 
        bagColor, 
        textColors, 
        colorType, 
        privacy, 
        deliveryOption,
        fileOption, 
        email, 
        fileUrl, 
        fileName,
        applicableCost, 
        gst, 
        totalAmount, 
        remark,
        category, // Support dynamic category (legacy)
        type,     // Support dynamic bag name (legacy)
        bagCategory, // Support newer client field names
        bagName      // Support newer client field names
    } = req.body;

    // Handle file upload
    let finalFileUrl = fileUrl;
    let finalFileName = fileName;
    if (req.file) {
        finalFileUrl = `/uploads/${req.file.filename}`;
        finalFileName = req.file.originalname;
    }

    // Handle textColors (multipart might send string)
    let finalTextColors = textColors;
    if (typeof textColors === 'string' && textColors) {
        try {
            finalTextColors = JSON.parse(textColors);
        } catch (e) {
            finalTextColors = textColors.split(',').map(c => c.trim());
        }
    }

    // Normalize side selection (One side / Both sides)
    const finalOrderType = orderType || bagType;
    
    // Normalize bag details
    const finalBagCategory = category || bagCategory || 'Non-Woven Bag';
    const finalBagName = type || bagName || 'D-Cut Bag';

    const quantityNum = Number(quantity);
    const applicableCostNum = Number(applicableCost);
    const gstNum = Number(gst);
    const totalAmountNum = Number(totalAmount);

    if (!finalOrderType || !bagSize || !Number.isFinite(quantityNum) || !Number.isFinite(totalAmountNum)) {
        return res.status(400).json({ message: 'Missing required order fields' });
    }
    if (quantityNum <= 0 || totalAmountNum <= 0) {
        return res.status(400).json({ message: 'Invalid order values' });
    }

    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const currentWallet = Number(user.walletBalance);
        if (!Number.isFinite(currentWallet)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid wallet balance. Please contact support.'
            });
        }

        if (Number(user.walletBalance || 0) < totalAmountNum) {
            return res.status(400).json({ 
                success: false, 
                message: "Insufficient wallet balance" 
            });
        }

        let orderId;
        for (let attempt = 0; attempt < 5; attempt++) {
            const candidate = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const exists = await Order.exists({ orderId: candidate });
            if (!exists) {
                orderId = candidate;
                break;
            }
        }
        if (!orderId) {
            return res.status(503).json({ message: 'Unable to generate order id' });
        }

        // Use a session if possible, but keeping it simple for now based on existing codebase pattern
        user.walletBalance = Number(user.walletBalance || 0) - totalAmountNum;
        await user.save();

        await Transaction.create({
            user: user._id,
            amount: totalAmountNum,
            type: 'Debit',
            status: 'Success',
            reference: orderId,
            description: `Payment for Order: ${finalBagName} (${finalOrderType})`
        });

        // Normalize privacy to boolean (client may send boolean or strings like "Required")
        const privacyBool =
            privacy === true ||
            privacy === 'true' ||
            privacy === 1 ||
            privacy === '1' ||
            privacy === 'Required';

        const order = await Order.create({
            user: user._id,
            orderId,
            orderName,
            orderType: finalOrderType,
            quantity: quantityNum,
            bagCategory: finalBagCategory,
            bagName: finalBagName,
            bagSize,
            bagColor,
            textColors: finalTextColors,
            colorType,
            privacy: privacyBool,
            deliveryOption,
            fileOption,
            email,
            fileUrl: finalFileUrl,
            fileName: finalFileName,
            applicableCost: Number.isFinite(applicableCostNum) ? applicableCostNum : undefined,
            gst: Number.isFinite(gstNum) ? gstNum : undefined,
            totalAmount: totalAmountNum,
            remark,
            status: 'Confirmed',
            memberId: user.memberId,
            trackingLog: [
                {
                    status: 'Confirmed',
                    message: 'Order Booked',
                    operator: user.name || 'System'
                }
            ]
        });

        res.status(201).json({ 
            success: true,
            message: 'Order created and paid successfully',
            order,
            walletBalance: user.walletBalance
        });
    } catch (error) {
        console.error('Order creation error:', error);
        return handleOrderError(res, error);
    }
};

// @desc    Get all orders for logged in user
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
    if (!ensureDbReady(res)) return;
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .lean();
        res.json(orders);
    } catch (error) {
        console.error(error);
        return handleOrderError(res, error);
    }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders/all
// @access  Private (Admin)
const getAllOrders = async (req, res) => {
    if (!ensureDbReady(res)) return;
    try {
        const orders = await Order.find({})
            .sort({ createdAt: -1 })
            .lean();
        res.json(orders);
    } catch (error) {
        console.error(error);
        return handleOrderError(res, error);
    }
};

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
const updateOrderStatus = async (req, res) => {
    if (!ensureDbReady(res)) return;
    const { id } = req.params;
    const { status } = req.body;
    
    // Must match Order schema enum to avoid 500s from runValidators
    const validStatuses = ['Pending', 'Confirmed', 'Printing', 'Packaging', 'Dispatched', 'Completed'];

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
        return handleOrderError(res, error);
    }
};

const getRecentOrders = async (req, res) => {
    if (!ensureDbReady(res)) return;
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(10);
        res.json(orders);
    } catch (error) {
        return handleOrderError(res, error);
    }
};

const getOrderById = async (req, res) => {
    if (!ensureDbReady(res)) return;
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid order id' });
        }
        const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.json(order);
    } catch (error) {
        return handleOrderError(res, error);
    }
};

const searchOrderByOrderId = async (req, res) => {
    if (!ensureDbReady(res)) return;
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId, user: req.user._id });
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.json(order);
    } catch (error) {
        return handleOrderError(res, error);
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
