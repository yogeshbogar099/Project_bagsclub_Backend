const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    orderId: { type: String, required: true, unique: true },
    orderName: { type: String },
    orderType: { type: String }, // One Side, Both Side
    quantity: { type: Number },
    bagCategory: { type: String, required: true }, // e.g., Non-Woven, Paper
    bagName: { type: String, required: true },
    bagSize: { type: String, required: true },
    bagColor: { type: String },
    textColors: [String],
    colorType: { type: String },
    privacy: { type: Boolean, default: false },
    deliveryOption: { type: String },
    fileOption: { type: String }, // upload, email
    email: { type: String },
    fileUrl: { type: String },
    fileName: { type: String },
    applicableCost: { type: Number },
    gst: { type: Number },
    totalAmount: { type: Number },
    remark: { type: String },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Printing', 'Packaging', 'Dispatched', 'Completed'],
        default: 'Confirmed'
    },
    memberId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
