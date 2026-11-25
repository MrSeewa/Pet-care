const { db, logAuditoria } = require('../db');

function listarCitas(req, res) {
    if (req.user && req.user.rol === 'Propietario') {
        const rows = db.prepare(`
            SELECT c.*, p.nombre AS propietario_nombre, m.nombre AS mascota_nombre, m.especie AS mascota_especie
            FROM citas c
            JOIN propietarios p ON p.id = c.propietario_id
            JOIN mascotas m ON m.id = c.mascota_id
            WHERE p.usuario_id = ?
            ORDER BY c.fecha DESC, c.hora DESC, c.id DESC
        `).all(req.user.id);
        return res.status(200).json(rows);
    }

    const rows = db.prepare(`
        SELECT c.*, p.nombre AS propietario_nombre, m.nombre AS mascota_nombre, m.especie AS mascota_especie
        FROM citas c
        JOIN propietarios p ON p.id = c.propietario_id
        JOIN mascotas m ON m.id = c.mascota_id
        ORDER BY c.id DESC
    `).all();
    return res.status(200).json(rows);
}

function obtenerCita(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID de cita inválido' });
    }

    const cita = db.prepare(`
        SELECT c.*, p.nombre AS propietario_nombre, m.nombre AS mascota_nombre
        FROM citas c
        JOIN propietarios p ON p.id = c.propietario_id
        JOIN mascotas m ON m.id = c.mascota_id
        WHERE c.id = ?
    `).get(id);

    if (!cita) {
        return res.status(404).json({ error: 'Cita no encontrada' });
    }

    return res.status(200).json(cita);
}

function crearCita(req, res) {
    const propietarioId = Number(req.body.propietarioId || req.body.propietario_id);
    const mascotaId = Number(req.body.mascotaId || req.body.mascota_id);
    const veterinarioId = req.body.veterinarioId ? Number(req.body.veterinarioId) : null;
    const fecha = String(req.body.fecha || '').trim();
    const hora = String(req.body.hora || '').trim();
    const motivo = String(req.body.motivo || '').trim();
    const activa = req.body.activa === undefined ? 1 : (req.body.activa ? 1 : 0);

    if (!Number.isInteger(propietarioId) || propietarioId <= 0) {
        return res.status(400).json({ error: 'Debe seleccionar un propietario válido' });
    }
    if (!Number.isInteger(mascotaId) || mascotaId <= 0) {
        return res.status(400).json({ error: 'Debe seleccionar una mascota válida' });
    }
    if (!fecha) {
        return res.status(400).json({ error: 'Falta fecha de la cita' });
    }
    if (!hora) {
        return res.status(400).json({ error: 'Falta hora de atención' });
    }
    if (!motivo) {
        return res.status(400).json({ error: 'Falta motivo de consulta' });
    }
    if (!activa) {
        return res.status(400).json({ error: 'La cita debe estar activa' });
    }

    const mascota = db.prepare('SELECT id, propietario_id FROM mascotas WHERE id = ?').get(mascotaId);
    if (!mascota || mascota.propietario_id !== propietarioId) {
        return res.status(400).json({ error: 'La mascota seleccionada no pertenece al propietario indicado' });
    }

    const result = db.prepare(`
        INSERT INTO citas (propietario_id, mascota_id, veterinario_id, fecha, hora, motivo, estado, activa)
        VALUES (?, ?, ?, ?, ?, ?, 'Programada', ?)
    `).run(propietarioId, mascotaId, veterinarioId, fecha, hora, motivo, activa);

    const created = db.prepare(`
        SELECT c.*, p.nombre AS propietario_nombre, m.nombre AS mascota_nombre, m.especie AS mascota_especie
        FROM citas c
        JOIN propietarios p ON p.id = c.propietario_id
        JOIN mascotas m ON m.id = c.mascota_id
        WHERE c.id = ?
    `).get(result.lastInsertRowid);

    logAuditoria({
        usuarioId: req.user?.id,
        usuarioEmail: req.user?.email,
        rol: req.user?.rol,
        accion: 'CREAR_CITA',
        recurso: `citas/${created.id}`,
        detalle: `Cita registrada para ${created.mascota_nombre} el ${fecha} ${hora}`
    });

    return res.status(201).json({
        mensaje: 'Cita registrada correctamente',
        cita: created
    });
}

function actualizarCita(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID de cita inválido' });
    }

    const existing = db.prepare('SELECT * FROM citas WHERE id = ?').get(id);
    if (!existing) {
        return res.status(404).json({ error: 'Cita no encontrada' });
    }

    const fecha = String(req.body.fecha ?? existing.fecha).trim();
    const hora = String(req.body.hora ?? existing.hora).trim();
    const motivo = String(req.body.motivo ?? existing.motivo).trim();
    const estado = String(req.body.estado ?? existing.estado).trim();

    db.prepare(`
        UPDATE citas
        SET fecha = ?, hora = ?, motivo = ?, estado = ?
        WHERE id = ?
    `).run(fecha, hora, motivo, estado, id);

    const updated = db.prepare('SELECT * FROM citas WHERE id = ?').get(id);
    logAuditoria({
        usuarioId: req.user?.id,
        usuarioEmail: req.user?.email,
        rol: req.user?.rol,
        accion: 'ACTUALIZAR_CITA',
        recurso: `citas/${id}`,
        detalle: `Cita ${id} actualizada`
    });

    return res.status(200).json(updated);
}

function eliminarCita(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID de cita inválido' });
    }

    const existing = db.prepare('SELECT * FROM citas WHERE id = ?').get(id);
    if (!existing) {
        return res.status(404).json({ error: 'Cita no encontrada' });
    }

    db.prepare('DELETE FROM citas WHERE id = ?').run(id);
    logAuditoria({
        usuarioId: req.user?.id,
        usuarioEmail: req.user?.email,
        rol: req.user?.rol,
        accion: 'ELIMINAR_CITA',
        recurso: `citas/${id}`,
        detalle: `Cita ${id} eliminada`
    });

    return res.status(200).json({ mensaje: 'Cita eliminada correctamente' });
}

module.exports = {
    listarCitas,
    obtenerCita,
    crearCita,
    actualizarCita,
    eliminarCita
};
