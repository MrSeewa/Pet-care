const { db, logAuditoria } = require('../db');

function obtenerDashboard(req, res) {
    const totalPropietarios = db.prepare('SELECT COUNT(*) AS total FROM propietarios').get().total;
    const totalMascotas = db.prepare('SELECT COUNT(*) AS total FROM mascotas').get().total;
    const totalCitas = db.prepare('SELECT COUNT(*) AS total FROM citas').get().total;
    const totalConsultas = db.prepare('SELECT COUNT(*) AS total FROM consultas').get().total;
    const totalVacunas = db.prepare('SELECT COUNT(*) AS total FROM vacunas').get().total;

    const proximasCitas = db.prepare(`
        SELECT c.id, c.fecha, c.hora, c.motivo, c.estado,
               p.nombre AS propietario_nombre, m.nombre AS mascota_nombre
        FROM citas c
        JOIN propietarios p ON p.id = c.propietario_id
        JOIN mascotas m ON m.id = c.mascota_id
        ORDER BY c.id DESC
        LIMIT 5
    `).all();

    return res.status(200).json({
        resumen: {
            propietarios: totalPropietarios,
            mascotas: totalMascotas,
            citas: totalCitas,
            consultas: totalConsultas,
            vacunas: totalVacunas
        },
        proximasCitas
    });
}

function listarConsultas(req, res) {
    const rows = db.prepare(`
        SELECT co.*, m.nombre AS mascota_nombre, u.nombre AS veterinario_nombre
        FROM consultas co
        JOIN mascotas m ON m.id = co.mascota_id
        JOIN usuarios u ON u.id = co.veterinario_id
        ORDER BY co.id DESC
    `).all();
    return res.status(200).json(rows);
}

function crearConsulta(req, res) {
    const mascotaId = Number(req.body.mascotaId || req.body.mascota_id);
    const fecha = String(req.body.fecha || new Date().toISOString().slice(0, 10)).trim();
    const diagnostico = String(req.body.diagnostico || '').trim();
    const tratamiento = String(req.body.tratamiento || '').trim();

    if (!Number.isInteger(mascotaId) || mascotaId <= 0 || !diagnostico || !tratamiento) {
        return res.status(400).json({ error: 'Campos obligatorios: mascotaId, diagnostico, tratamiento' });
    }

    const result = db.prepare(`
        INSERT INTO consultas (mascota_id, veterinario_id, fecha, diagnostico, tratamiento)
        VALUES (?, ?, ?, ?, ?)
    `).run(mascotaId, req.user.id, fecha, diagnostico, tratamiento);

    const created = db.prepare('SELECT * FROM consultas WHERE id = ?').get(result.lastInsertRowid);
    logAuditoria({
        usuarioId: req.user.id,
        usuarioEmail: req.user.email,
        rol: req.user.rol,
        accion: 'CREAR_CONSULTA',
        recurso: `consultas/${created.id}`,
        detalle: `Consulta clínica registrada para mascota ${mascotaId}`
    });

    return res.status(201).json(created);
}

function listarVacunas(req, res) {
    const rows = db.prepare(`
        SELECT v.*, m.nombre AS mascota_nombre, u.nombre AS veterinario_nombre
        FROM vacunas v
        JOIN mascotas m ON m.id = v.mascota_id
        JOIN usuarios u ON u.id = v.veterinario_id
        ORDER BY v.id DESC
    `).all();
    return res.status(200).json(rows);
}

function crearVacuna(req, res) {
    const mascotaId = Number(req.body.mascotaId || req.body.mascota_id);
    const nombre = String(req.body.nombre || '').trim();
    const fechaAplicacion = String(req.body.fechaAplicacion || new Date().toISOString().slice(0, 10)).trim();
    const proximaDosis = String(req.body.proximaDosis || '').trim();

    if (!Number.isInteger(mascotaId) || mascotaId <= 0 || !nombre) {
        return res.status(400).json({ error: 'Campos obligatorios: mascotaId, nombre' });
    }

    const result = db.prepare(`
        INSERT INTO vacunas (mascota_id, veterinario_id, nombre, fecha_aplicacion, proxima_dosis)
        VALUES (?, ?, ?, ?, ?)
    `).run(mascotaId, req.user.id, nombre, fechaAplicacion, proximaDosis);

    const created = db.prepare('SELECT * FROM vacunas WHERE id = ?').get(result.lastInsertRowid);
    logAuditoria({
        usuarioId: req.user.id,
        usuarioEmail: req.user.email,
        rol: req.user.rol,
        accion: 'REGISTRAR_VACUNA',
        recurso: `vacunas/${created.id}`,
        detalle: `Vacuna ${nombre} registrada para mascota ${mascotaId}`
    });

    return res.status(201).json(created);
}

function listarAuditoria(req, res) {
    const rows = db.prepare('SELECT * FROM auditoria ORDER BY id DESC LIMIT 200').all();
    return res.status(200).json(rows);
}

module.exports = {
    obtenerDashboard,
    listarConsultas,
    crearConsulta,
    listarVacunas,
    crearVacuna,
    listarAuditoria
};
