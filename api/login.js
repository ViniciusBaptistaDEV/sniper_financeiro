module.exports = function handler(req, res) {
    // Na Vercel, o body já vem parseado se o Content-Type for application/json
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { user, pass } = body;

    if (user === process.env.APP_LOGIN && pass === process.env.APP_PASSWORD) {
        return res.status(200).json({ token: 'sniper-auth-success' });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
};
