const jwt = require('jsonwebtoken')
require('dotenv').config();

// Get the token from req and try to decode it with our secret key
// If token is decoded correctly without null then we can move to next.
// Otherwise error is thrown

module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization');

    if (!authHeader) {
        req.isAuth = false
        return next()
    }

    const token = req.get('Authorization').split(' ')[1]
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.JWT_TOKEN)
    } catch (err) {
        req.isAuth = false
        return next()
    }
    // Unable to verify token
    if (!decodedToken) {
        req.isAuth = false
        return next()
    }
    req.userId = decodedToken.userId
    req.isAuth = true
    next()
}