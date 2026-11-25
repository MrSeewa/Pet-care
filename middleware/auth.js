const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'petcare-qa-dev-secret-key-2026';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado: token no proporcionado' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.rol)) {
            return res.status(403).json({ error: 'No tiene permisos para realizar esta acción' });
        }
        return next();
    };
}

module.exports = {
    JWT_SECRET,
    authenticateToken,
    authorizeRoles
};
