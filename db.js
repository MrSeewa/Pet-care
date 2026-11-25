const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.PETCARE_DB_PATH || path.join(__dirname, 'petcare.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const derived = crypto.scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(key, 'hex');
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
}

function initSchema() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            rol TEXT NOT NULL CHECK (rol IN ('Administrador', 'Veterinario', 'Recepcionista', 'Propietario')),
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS propietarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
            nombre TEXT NOT NULL,
            rut TEXT NOT NULL,
            email TEXT NOT NULL,
            telefono TEXT NOT NULL,
            direccion TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS mascotas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            propietario_id INTEGER NOT NULL REFERENCES propietarios(id) ON DELETE CASCADE,
            nombre TEXT NOT NULL,
            especie TEXT NOT NULL,
            raza TEXT DEFAULT 'Mestizo',
            edad INTEGER DEFAULT 1,
            peso REAL DEFAULT 5.0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS citas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            propietario_id INTEGER NOT NULL REFERENCES propietarios(id) ON DELETE CASCADE,
            mascota_id INTEGER NOT NULL REFERENCES mascotas(id) ON DELETE CASCADE,
            veterinario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
            fecha TEXT NOT NULL,
            hora TEXT NOT NULL,
            motivo TEXT NOT NULL,
            estado TEXT DEFAULT 'Programada',
            activa INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS consultas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mascota_id INTEGER NOT NULL REFERENCES mascotas(id) ON DELETE CASCADE,
            veterinario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            fecha TEXT NOT NULL,
            diagnostico TEXT NOT NULL,
            tratamiento TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS vacunas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mascota_id INTEGER NOT NULL REFERENCES mascotas(id) ON DELETE CASCADE,
            veterinario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            nombre TEXT NOT NULL,
            fecha_aplicacion TEXT NOT NULL,
            proxima_dosis TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS auditoria (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            usuario_email TEXT,
            rol TEXT,
            accion TEXT NOT NULL,
            recurso TEXT NOT NULL,
            detalle TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );
    `);
}

function logAuditoria({ usuarioId = null, usuarioEmail = 'anonimo', rol = 'N/A', accion, recurso, detalle = '' }) {
    const stmt = db.prepare(`
        INSERT INTO auditoria (usuario_id, usuario_email, rol, accion, recurso, detalle)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(usuarioId, usuarioEmail, rol, accion, recurso, detalle);
}

function seedInitialData() {
    const countUsers = db.prepare('SELECT COUNT(*) AS total FROM usuarios').get().total;
    if (countUsers > 0) return;

    const defaultPassword = process.env.QA_DEFAULT_PASSWORD || 'SecurePassword2026!';
    const insertUser = db.prepare(`
        INSERT INTO usuarios (nombre, email, password_hash, rol)
        VALUES (?, ?, ?, ?)
    `);

    const adminRes = insertUser.run('Admin PetCare', 'admin@petcare.cl', hashPassword(defaultPassword), 'Administrador');
    const vetRes = insertUser.run('Dr. Carlos Mendoza', 'veterinario.prueba@petcare.cl', hashPassword(defaultPassword), 'Veterinario');
    insertUser.run('Laura Gómez', 'recepcionista.prueba@petcare.cl', hashPassword(defaultPassword), 'Recepcionista');
    const propUserRes = insertUser.run('María González', 'propietario.prueba@petcare.cl', hashPassword(defaultPassword), 'Propietario');

    const insertProp = db.prepare(`
        INSERT INTO propietarios (usuario_id, nombre, rut, email, telefono, direccion)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const p1 = insertProp.run(propUserRes.lastInsertRowid, 'María González', '18.456.789-2', 'propietario.prueba@petcare.cl', '+56912345678', 'Av. Providencia 1234, Santiago');
    const p2 = insertProp.run(null, 'Juan Pérez', '16.234.567-8', 'juan.perez@correo.cl', '+56987654321', 'Calle Las Condes 456, Santiago');

    const insertMascota = db.prepare(`
        INSERT INTO mascotas (propietario_id, nombre, especie, raza, edad, peso)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const m1 = insertMascota.run(p1.lastInsertRowid, 'Firulais', 'Perro', 'Labrador', 4, 24.5);
    const m2 = insertMascota.run(p1.lastInsertRowid, 'Michi', 'Gato', 'Siamés', 2, 4.2);
    const m3 = insertMascota.run(p2.lastInsertRowid, 'Rocky', 'Perro', 'Bulldog', 3, 18.0);

    const insertCita = db.prepare(`
        INSERT INTO citas (propietario_id, mascota_id, veterinario_id, fecha, hora, motivo, estado, activa)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertCita.run(p1.lastInsertRowid, m1.lastInsertRowid, vetRes.lastInsertRowid, '2026-11-10', '10:00', 'Control anual', 'Programada', 1);
    insertCita.run(p2.lastInsertRowid, m3.lastInsertRowid, vetRes.lastInsertRowid, '2026-11-12', '15:30', 'Vacuna antirrábica', 'Programada', 1);

    logAuditoria({
        usuarioId: Number(adminRes.lastInsertRowid),
        usuarioEmail: 'admin@petcare.cl',
        rol: 'Administrador',
        accion: 'SEED_INICIAL',
        recurso: 'sistema',
        detalle: 'Datos iniciales de QA cargados correctamente'
    });
}

initSchema();
seedInitialData();

module.exports = {
    db,
    hashPassword,
    verifyPassword,
    logAuditoria
};
