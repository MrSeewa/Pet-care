const jwt = require('jsonwebtoken');
const { db, verifyPassword, logAuditoria } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

function login(req, res) {
    const email = (req.body.email || req.body.usuario || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!email || !password) {
        return res.status(400).json({ error: 'Debe ingresar correo electrónico y contraseña' });
    }

    const user = db.prepare('SELECT id, nombre, email, password_hash, rol FROM usuarios WHERE lower(email) = ?').get(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
        logAuditoria({
            usuarioEmail: email,
            accion: 'LOGIN_FALLIDO',
            recurso: 'auth',
            detalle: 'Intento de inicio de sesión con credenciales inválidas'
        });
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const payload = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    logAuditoria({
        usuarioId: user.id,
        usuarioEmail: user.email,
        rol: user.rol,
        accion: 'LOGIN_EXITOSO',
        recurso: 'auth',
        detalle: 'Inicio de sesión mediante JWT'
    });

    return res.status(200).json({
        token,
        user: payload
    });
}

function getMe(req, res) {
    return res.status(200).json({ user: req.user });
}

module.exports = { login, getMe };
