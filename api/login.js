export default function handler(req, res) {
    const { user, pass } = JSON.parse(req.body);
    if (user === process.env.APP_LOGIN && pass === process.env.APP_PASSWORD) {
        // Em um app real, use JWT. Aqui simularemos um token simples.
        return res.status(200).json({ token: 'sniper-auth-success' });
    }
    return res.status(401).json({ message: 'Invalid credentials' });
}
