const mongoose = require('mongoose');

const statSchema = mongoose.Schema({
    bagsPrinted: { type: Number, default: 0 },
    clientsServed: { type: Number, default: 0 },
    teamMembers: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Stat', statSchema);