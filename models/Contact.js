const mongoose = require('mongoose');

const contactSchema = mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, default: 'new' } // new, read, resolved
}, { timestamps: true });

module.exports = mongoose.model('Contact', contactSchema);