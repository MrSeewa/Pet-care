const { db, logAuditoria } = require('../db');

function listarPropietarios(req, res) {
    if (req.user && req.user.rol === 'Propietario') {
        const propios = db.prepare('SELECT * FROM propietarios WHERE usuario_id = ? ORDER BY id DESC').all(req.user.id);
        return res.status(200).json(propios);
    }
    const rows = db.prepare('SELECT * FROM propietarios ORDER BY id DESC').all();
    return res.status(200).json(rows);
}

function obtenerPropietario(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID de propietario inválido' });
    }

    const propietario = db.prepare('SELECT * FROM propietarios WHERE id = ?').get(id);
    if (!propietario) {
        return res.status(404).json({ error: 'Propietario no encontrado' });
    }

    if (req.user && req.user.rol === 'Propietario' && propietario.usuario_id !== req.user.id) {
        return res.status(403).json({ error: 'No autorizado para consultar otro propietario' });
    }

    return res.status(200).json(propietario);
}

function crearPropietario(req, res) {
    const { nombre, rut, email, telefono, direccion = '' } = req.body;
    if (!nombre || !rut || !email || !telefono) {
        return res.status(400).json({ error: 'Campos obligatorios: nombre, rut, email, telefono' });
    }

    const result = db.prepare(`
        INSERT INTO propietarios (nombre, rut, email, telefono, direccion)
        VALUES (?, ?, ?, ?, ?)
    `).run(nombre.trim(), rut.trim(), email.trim().toLowerCase(), telefono.trim(), String(direccion).trim());

    const created = db.prepare('SELECT * FROM propietarios WHERE id = ?').get(result.lastInsertRowid);
    logAuditoria({
        usuarioId: req.user?.id,
        usuarioEmail: req.user?.email,
        rol: req.user?.rol,
        accion: 'CREAR_PROPIETARIO',
        recurso: `propietarios/${created.id}`,
        detalle: `Propietario ${created.nombre} creado`
    });

    return res.status(201).json(created);
}

function actualizarPropietario(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID de propietario inválido' });
    }

    const existing = db.prepare('SELECT * FROM propietarios WHERE id = ?').get(id);
    if (!existing) {
        return res.status(404).json({ error: 'Propietario no encontrado' });
    }

    const nombre = (req.body.nombre ?? existing.nombre).trim();
    const rut = (req.body.rut ?? existing.rut).trim();
    const email = (req.body.email ?? existing.email).trim().toLowerCase();
    const telefono = (req.body.telefono ?? existing.telefono).trim();
    const direccion = String(req.body.direccion ?? existing.direccion).trim();

    db.prepare(`
        UPDATE propietarios
        SET nombre = ?, rut = ?, email = ?, telefono = ?, direccion = ?
        WHERE id = ?
    `).run(nombre, rut, email, telefono, direccion, id);

    const updated = db.prepare('SELECT * FROM propietarios WHERE id = ?').get(id);
    logAuditoria({
        usuarioId: req.user?.id,
        usuarioEmail: req.user?.email,
        rol: req.user?.rol,
        accion: 'ACTUALIZAR_PROPIETARIO',
        recurso: `propietarios/${id}`,
        detalle: `Propietario ${updated.nombre} actualizado`
    });

    return res.status(200).json(updated);
}

function eliminarPropietario(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID de propietario inválido' });
    }

    const existing = db.prepare('SELECT * FROM propietarios WHERE id = ?').get(id);
    if (!existing) {
        return res.status(404).json({ error: 'Propietario no encontrado' });
    }

    db.prepare('DELETE FROM propietarios WHERE id = ?').run(id);
    logAuditoria({
        usuarioId: req.user?.id,
        usuarioEmail: req.user?.email,
        rol: req.user?.rol,
        accion: 'ELIMINAR_PROPIETARIO',
        recurso: `propietarios/${id}`,
        detalle: `Propietario ${existing.nombre} eliminado`
    });

    return res.status(200).json({ mensaje: 'Propietario eliminado correctamente' });
}

module.exports = {
    listarPropietarios,
    obtenerPropietario,
    crearPropietario,
    actualizarPropietario,
    eliminarPropietario
};
