const express = require('express');
const router = express.Router();

// @desc    Get pricing for D-Cut Bag
// @route   GET /api/pricing/dcut-bag
// @access  Public
router.get('/dcut-bag', (req, res) => {
    // In a real production app, this might come from a DB, 
    // but as per instructions we provide the endpoint returning pricePerBag: 5
    res.json({ 
        pricePerBag: 5 
    });
});

module.exports = router;
