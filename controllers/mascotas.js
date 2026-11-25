const { db, logAuditoria } = require('../db');

function listarMascotas(req, res) {
    const propietarioId = req.query.propietarioId ? Number(req.query.propietarioId) : null;

    if (req.user && req.user.rol === 'Propietario') {
        const ownProps = db.prepare('SELECT id FROM propietarios WHERE usuario_id = ?').all(req.user.id).map((p) => p.id);
        if (ownProps.length === 0) return res.status(200).json([]);
        if (propietarioId && !ownProps.includes(propietarioId)) {
            return res.status(403).json({ error: 'Un propietario solo puede consultar sus propias mascotas' });
        }
        const placeholders = ownProps.map(() => '?').join(',');
        const rows = db.prepare(`
            SELECT m.*, p.nombre AS propietario_nombre
            FROM mascotas m
            JOIN propietarios p ON p.id = m.propietario_id
            WHERE m.propietario_id IN (${placeholders})
            ORDER BY m.id DESC
        `).all(...ownProps);
        return res.status(200).json(rows);
    }

    if (propietarioId) {
        const rows = db.prepare(`
            SELECT m.*, p.nombre AS propietario_nombre
            FROM mascotas m
            JOIN propietarios p ON p.id = m.propietario_id
            WHERE m.propietario_id = ?
            ORDER BY m.id DESC
        `).all(propietarioId);
        return res.status(200).json(rows);
    }

    const rows = db.prepare(`
        SELECT m.*, p.nombre AS propietario_nombre
        FROM mascotas m
        JOIN propietarios p ON p.id = m.propietario_id
        ORDER BY m.id DESC
    `).all();
    return res.status(200).json(rows);
}

function obtenerMascotas(req, res) {
    const propietarioId = Number(req.params.propietarioId);
    if (!Number.isInteger(propietarioId) || propietarioId <= 0) {
        return res.status(400).json({ error: 'ID de propietario inválido' });
    }

    if (req.user && req.user.rol === 'Propietario') {
        const prop = db.prepare('SELECT id FROM propietarios WHERE id = ? AND usuario_id = ?').get(propietarioId, req.user.id);
        if (!prop) {
            return res.status(403).json({ error: 'No autorizado para consultar mascotas de otro propietario' });
        }
    }

    const rows = db.prepare('SELECT * FROM mascotas WHERE propietario_id = ? ORDER BY id DESC').all(propietarioId);
    return res.status(200).json(rows);
}

function obtenerMascotaPorId(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID de mascota inválido' });
    }

    const mascota = db.prepare('SELECT * FROM mascotas WHERE id = ?').get(id);
    if (!mascota) {
        return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    return res.status(200).json(mascota);
}

function crearMascota(req, res) {
    const propietarioId = Number(req.body.propietarioId || req.body.propietario_id);
    const { nombre, especie, raza = 'Mestizo', edad = 1, peso = 5.0 } = req.body;

    if (!Number.isInteger(propietarioId) || propietarioId <= 0 || !nombre || !especie) {
        return res.status(400).json({ error: 'Campos obligatorios: propietarioId, nombre, especie' });
    }

    const owner = db.prepare('SELECT id FROM propietarios WHERE id = ?').get(propietarioId);
    if (!owner) {
        return res.status(404).json({ error: 'El propietario asociado no existe' });
    }

    const result = db.prepare(`
        INSERT INTO mascotas (propietario_id, nombre, especie, raza, edad, peso)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(propietarioId, String(nombre).trim(), String(especie).trim(), String(raza).trim(), Number(edad), Number(peso));

    const created = db.prepare('SELECT * FROM mascotas WHERE id = ?').get(result.lastInsertRowid);
    logAuditoria({
        usuarioId: req.user?.id,
        usuarioEmail: req.user?.email,
        rol: req.user?.rol,
        accion: 'CREAR_MASCOTA',
        recurso: `mascotas/${created.id}`,
        detalle: `Mascota ${created.nombre} registrada`
    });

    return res.status(201).json(created);
}

function actualizarMascota(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID de mascota inválido' });
    }

    const existing = db.prepare('SELECT * FROM mascotas WHERE id = ?').get(id);
    if (!existing) {
        return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    const nombre = String(req.body.nombre ?? existing.nombre).trim();
    const especie = String(req.body.especie ?? existing.especie).trim();
    const raza = String(req.body.raza ?? existing.raza).trim();
    const edad = Number(req.body.edad ?? existing.edad);
    const peso = Number(req.body.peso ?? existing.peso);

    db.prepare(`
        UPDATE mascotas
        SET nombre = ?, especie = ?, raza = ?, edad = ?, peso = ?
        WHERE id = ?
    `).run(nombre, especie, raza, edad, peso, id);

    const updated = db.prepare('SELECT * FROM mascotas WHERE id = ?').get(id);
    logAuditoria({
        usuarioId: req.user?.id,
        usuarioEmail: req.user?.email,
        rol: req.user?.rol,
        accion: 'ACTUALIZAR_MASCOTA',
        recurso: `mascotas/${id}`,
        detalle: `Mascota ${updated.nombre} actualizada`
    });

    return res.status(200).json(updated);
}

function eliminarMascota(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID de mascota inválido' });
    }

    const existing = db.prepare('SELECT * FROM mascotas WHERE id = ?').get(id);
    if (!existing) {
        return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    db.prepare('DELETE FROM mascotas WHERE id = ?').run(id);
    logAuditoria({
        usuarioId: req.user?.id,
        usuarioEmail: req.user?.email,
        rol: req.user?.rol,
        accion: 'ELIMINAR_MASCOTA',
        recurso: `mascotas/${id}`,
        detalle: `Mascota ${existing.nombre} eliminada`
    });

    return res.status(200).json({ mensaje: 'Mascota eliminada correctamente' });
}

module.exports = {
    listarMascotas,
    obtenerMascotas,
    obtenerMascotaPorId,
    crearMascota,
    actualizarMascota,
    eliminarMascota
};
