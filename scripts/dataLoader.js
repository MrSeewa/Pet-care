const { fakerES: faker } = require('@faker-js/faker');
const { db, hashPassword } = require('../db');

const TOTAL_RECORDS = Number(process.env.DATA_LOADER_COUNT || 200);

function runDataLoader(count = TOTAL_RECORDS) {
    const defaultHash = hashPassword(process.env.QA_DEFAULT_PASSWORD || 'SecurePassword2026!');

    const insertUser = db.prepare(`
        INSERT OR IGNORE INTO usuarios (nombre, email, password_hash, rol)
        VALUES (?, ?, ?, 'Propietario')
    `);
    const insertProp = db.prepare(`
        INSERT INTO propietarios (usuario_id, nombre, rut, email, telefono, direccion)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertMascota = db.prepare(`
        INSERT INTO mascotas (propietario_id, nombre, especie, raza, edad, peso)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertCita = db.prepare(`
        INSERT INTO citas (propietario_id, mascota_id, fecha, hora, motivo, estado, activa)
        VALUES (?, ?, ?, ?, ?, 'Programada', 1)
    `);

    const especies = ['Perro', 'Gato', 'Conejo', 'Ave'];
    const motivos = [
        'Control general y revisión de vacunas',
        'Vacunación anual',
        'Desparasitación',
        'Control postoperatorio',
        'Revisión dermatológica'
    ];

    db.exec('BEGIN TRANSACTION;');
    try {
        for (let i = 1; i <= count; i++) {
            const nombre = faker.person.fullName();
            const email = `qa.propietario.${Date.now()}.${i}@petcare.cl`;
            const rut = `${faker.number.int({ min: 10, max: 25 })}.${faker.number.int({ min: 100, max: 999 })}.${faker.number.int({ min: 100, max: 999 })}-${faker.number.int({ min: 0, max: 9 })}`;
            const telefono = `+569${faker.number.int({ min: 10000000, max: 99999999 })}`;
            const direccion = faker.location.streetAddress();

            const userRes = insertUser.run(nombre, email, defaultHash);
            const propRes = insertProp.run(userRes.lastInsertRowid || null, nombre, rut, email, telefono, direccion);
            const propId = Number(propRes.lastInsertRowid);

            const especie = especies[i % especies.length];
            const mascotaRes = insertMascota.run(
                propId,
                faker.animal.petName ? faker.animal.petName() : `Mascota ${i}`,
                especie,
                'Mestizo',
                faker.number.int({ min: 1, max: 14 }),
                Number(faker.number.float({ min: 1.5, max: 35.0, fractionDigits: 1 }))
            );
            const mascotaId = Number(mascotaRes.lastInsertRowid);

            const hora = `${String(9 + (i % 9)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`;
            insertCita.run(propId, mascotaId, '2026-11-20', hora, motivos[i % motivos.length]);
        }
        db.exec('COMMIT;');
    } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
    }

    const totals = {
        usuarios: db.prepare('SELECT COUNT(*) AS c FROM usuarios').get().c,
        propietarios: db.prepare('SELECT COUNT(*) AS c FROM propietarios').get().c,
        mascotas: db.prepare('SELECT COUNT(*) AS c FROM mascotas').get().c,
        citas: db.prepare('SELECT COUNT(*) AS c FROM citas').get().c
    };

    console.log(`DataLoader completado (${count} registros generados por tabla):`, totals);
    return totals;
}

if (require.main === module) {
    runDataLoader();
}

module.exports = { runDataLoader };
