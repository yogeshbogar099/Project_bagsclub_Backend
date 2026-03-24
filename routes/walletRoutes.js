const express = require('express');
const router = express.Router();
const { addMoney, getTransactions, getBalance, getAllTransactions, getUserWalletDetails } = require('../controllers/walletController');
const { protect, checkCapability } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/permissions');

router.post('/add', protect, addMoney);
router.get('/transactions', protect, getTransactions);
router.get('/balance', protect, getBalance);

// Admin Routes
router.get('/admin/transactions', protect, checkCapability(PERMISSIONS.VIEW_ALL_TRANSACTIONS), getAllTransactions);
router.get('/admin/user/:memberId', protect, checkCapability(PERMISSIONS.VIEW_ALL_TRANSACTIONS), getUserWalletDetails);

module.exports = router;
