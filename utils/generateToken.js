const jwt = require('jsonwebtoken');

const generateAccessToken = (id) => {
    try {
        console.log('Generating Access Token for user ID:', id);
        const token = jwt.sign({ id }, process.env.JWT_SECRET, {
            expiresIn: '15m'
        });
        console.log('Access Token generated successfully');
        return token;
    } catch (error) {
        console.error('Error signing access token:', error);
        throw error;
    }
};

const generateRefreshToken = (res, id) => {
    try {
        console.log('Generating Refresh Token for user ID:', id);
        const refreshToken = jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
            expiresIn: '30d'
        });

        res.cookie('jwt', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        console.log('Refresh Token generated and set in cookie successfully');
    } catch (error) {
        console.error('Error signing refresh token:', error);
        throw error;
    }
};

module.exports = { generateAccessToken, generateRefreshToken };
