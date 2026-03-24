const mongoose = require('mongoose');

const transactionSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    amount: { type: Number, required: true },
    type: {
        type: String,
        enum: ['Credit', 'Debit'],
        required: true
    },
    status: {
        type: String,
        enum: ['Success', 'Pending', 'Failed'],
        default: 'Pending'
    },
    reference: { type: String, unique: true, sparse: true }, // Transaction ID or Ref
    description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
