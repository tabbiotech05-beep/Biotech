import jwt from 'jsonwebtoken';

import User from '../models/User.js';

const auth = async (req, res, next) => {
    const token = req.header('x-auth-token') || req.query.token;

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123');

        // Fetch user to get current role and username
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ msg: 'User no longer exists' });
        }

        req.user = {
            userId: decoded.userId,
            role: user.role,
            username: user.username
        };
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

export default auth;
