const jwt = require('jsonwebtoken')
require('dotenv').config();

// Get the token from req and try to decode it with our secret key
// If token is decoded correctly without null then we can move to next.
// Otherwise error is thrown

module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization');
    if (!authHeader) {
        const error = new Error('Not authenticated')
        error.statusCode = 401
        throw error
    }

    const token = req.get('Authorization').split(' ')[1]
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.JWT_TOKEN)
    } catch (err) {
        err.statusCode = 500
        throw err
    }
    // Unable to verify token
    if (!decodedToken) {
        const error = new Error('Not Authenticated')
        error.statusCode = 401
        throw error
    }
    req.userId = decodedToken.userId
    next()
}