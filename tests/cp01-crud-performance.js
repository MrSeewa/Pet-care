const assert = require('node:assert');

const BASE_URL = process.env.API_URL || 'http://127.0.0.1:3000';

async function timedFetch(url, options = {}) {
    const start = performance.now();
    const res = await fetch(url, options);
    const elapsedMs = performance.now() - start;
    const body = await res.json().catch(() => ({}));
    return { status: res.status, elapsedMs, body };
}

async function run() {
    const login = await timedFetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'recepcionista.prueba@petcare.cl', password: 'SecurePassword2026!' })
    });
    assert.strictEqual(login.status, 200, 'Login de recepcionista debe responder 200');
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${login.body.token}`
    };

    const results = [];

    // 1. CRUD Propietario
    const createProp = await timedFetch(`${BASE_URL}/api/propietarios`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            nombre: 'Propietario Prueba CP01',
            rut: '19.111.222-3',
            email: 'cp01@petcare.cl',
            telefono: '+56955554444'
        })
    });
    assert.strictEqual(createProp.status, 201);
    results.push({ op: 'POST /api/propietarios', ms: createProp.elapsedMs, status: createProp.status });
    const propId = createProp.body.id;

    const getProps = await timedFetch(`${BASE_URL}/api/propietarios`, { headers });
    assert.strictEqual(getProps.status, 200);
    results.push({ op: 'GET /api/propietarios', ms: getProps.elapsedMs, status: getProps.status });

    const putProp = await timedFetch(`${BASE_URL}/api/propietarios/${propId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ telefono: '+56999998888' })
    });
    assert.strictEqual(putProp.status, 200);
    results.push({ op: 'PUT /api/propietarios/:id', ms: putProp.elapsedMs, status: putProp.status });

    // 2. CRUD Mascota
    const createMascota = await timedFetch(`${BASE_URL}/api/mascotas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ propietarioId: propId, nombre: 'Toby', especie: 'Perro', raza: 'Poodle' })
    });
    assert.strictEqual(createMascota.status, 201);
    results.push({ op: 'POST /api/mascotas', ms: createMascota.elapsedMs, status: createMascota.status });
    const mascotaId = createMascota.body.id;

    // 3. CRUD Cita
    const createCita = await timedFetch(`${BASE_URL}/api/citas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            propietarioId: propId,
            mascotaId,
            fecha: '2026-11-15',
            hora: '11:30',
            motivo: 'Control CP-01',
            activa: true
        })
    });
    assert.strictEqual(createCita.status, 201);
    results.push({ op: 'POST /api/citas', ms: createCita.elapsedMs, status: createCita.status });
    const citaId = createCita.body.cita.id;

    const delCita = await timedFetch(`${BASE_URL}/api/citas/${citaId}`, { method: 'DELETE', headers });
    assert.strictEqual(delCita.status, 200);
    results.push({ op: 'DELETE /api/citas/:id', ms: delCita.elapsedMs, status: delCita.status });

    const delMascota = await timedFetch(`${BASE_URL}/api/mascotas/${mascotaId}`, { method: 'DELETE', headers });
    assert.strictEqual(delMascota.status, 200);
    results.push({ op: 'DELETE /api/mascotas/:id', ms: delMascota.elapsedMs, status: delMascota.status });

    const delProp = await timedFetch(`${BASE_URL}/api/propietarios/${propId}`, { method: 'DELETE', headers });
    assert.strictEqual(delProp.status, 200);
    results.push({ op: 'DELETE /api/propietarios/:id', ms: delProp.elapsedMs, status: delProp.status });

    console.table(results.map((r) => ({ ...r, ms: Number(r.ms.toFixed(2)) })));
    for (const r of results) {
        assert.ok(r.ms < 300, `Latencia excedida en ${r.op}: ${r.ms.toFixed(2)}ms`);
    }
    console.log('CP-01 PASSED: 100% de operaciones CRUD respondieron en < 300ms.');
}

run().catch((err) => {
    console.error('CP-01 FAILED:', err);
    process.exit(1);
});
