const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    orderId: { type: String, required: true, unique: true },
    bagCategory: { type: String, required: true }, // e.g., Non-Woven, Paper
    bagName: { type: String, required: true },
    bagSize: { type: String, required: true },
    bagColorType: { type: String, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Printing', 'Packaging', 'Dispatched', 'Completed'],
        default: 'Pending'
    },
    fileName: { type: String },
    fileUrl: { type: String },
    memberId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
