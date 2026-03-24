const Contact = require('../models/Contact');

const submitContact = async (req, res) => {
    const { name, email, message } = req.body;
    try {
        const doc = await Contact.create({
            name,
            email,
            message,
            status: 'new'
        });
        res.status(201).json({
            _id: String(doc._id),
            name: doc.name,
            email: doc.email,
            message: doc.message,
            status: doc.status,
            createdAt: doc.createdAt
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = { submitContact };
