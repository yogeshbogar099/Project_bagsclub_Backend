const express = require('express');
const router = express.Router();
const {
    loginUser,
    registerUser,
    logoutUser,
    getUserProfile,
    refreshToken,
    changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/refresh', refreshToken);
router.get('/profile', protect, getUserProfile);
router.post('/change-password', protect, changePassword);

// Root route for /api/auth to avoid 404/500 if someone calls it directly
router.post('/', (req, res) => {
    res.status(400).json({ message: 'Auth endpoint requires sub-route (/login or /register)' });
});

module.exports = router;
