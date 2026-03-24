const express = require('express');
const router = express.Router();
const { getAllUsers, updateUserRole } = require('../controllers/userController');
const { getUserProfile, changePassword } = require('../controllers/authController');
const { protect, checkCapability } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/permissions');

router.get('/profile', protect, getUserProfile);
router.put('/change-password', protect, changePassword);
router.get('/', protect, checkCapability(PERMISSIONS.MANAGE_USERS), getAllUsers);
router.put('/:id/role', protect, checkCapability(PERMISSIONS.MANAGE_ROLES), updateUserRole);

module.exports = router;
