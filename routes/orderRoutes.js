const express = require('express');
const router = express.Router();
const { 
    createOrder, 
    getOrders, 
    getAllOrders, 
    updateOrderStatus,
    getRecentOrders,
    getOrderById,
    searchOrderByOrderId
} = require('../controllers/orderController');
const { protect, checkCapability } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/permissions');

router.route('/')
    .post(protect, createOrder)
    .get(protect, getOrders);

router.get('/recent', protect, getRecentOrders);
router.get('/search/:orderId', protect, searchOrderByOrderId);
router.get('/:id', protect, getOrderById);

router.get('/all', protect, checkCapability(PERMISSIONS.MANAGE_ORDERS), getAllOrders);
router.put('/:id/status', protect, checkCapability(PERMISSIONS.MANAGE_ORDERS), updateOrderStatus);

module.exports = router;
