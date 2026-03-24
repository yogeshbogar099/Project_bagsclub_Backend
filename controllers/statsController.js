const Stat = require('../models/Stat');

const getStats = async (req, res) => {
    try {
        let stats = await Stat.findOne().lean();
        if (!stats) {
            stats = await Stat.create({ bagsPrinted: 12500, clientsServed: 450, teamMembers: 25 });
            return res.json({
                bagsPrinted: stats.bagsPrinted,
                clientsServed: stats.clientsServed,
                teamMembers: stats.teamMembers
            });
        }
        return res.json({
            bagsPrinted: stats.bagsPrinted,
            clientsServed: stats.clientsServed,
            teamMembers: stats.teamMembers
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getStats };
