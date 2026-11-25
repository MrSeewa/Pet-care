const assert = require('node:assert');

const BASE_URL = process.env.API_URL || 'http://127.0.0.1:3000';
const CONCURRENT_USERS = 200;

async function run() {
    const loginRes = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'veterinario.prueba@petcare.cl', password: 'SecurePassword2026!' })
    });
    assert.strictEqual(loginRes.status, 200);
    const { token } = await loginRes.json();
    const headers = { Authorization: `Bearer ${token}` };

    const start = performance.now();
    const requests = Array.from({ length: CONCURRENT_USERS }, (_v, idx) =>
        fetch(`${BASE_URL}/api/dashboard`, { headers }).then(async (r) => ({
            idx,
            status: r.status,
            data: await r.json()
        }))
    );

    const responses = await Promise.all(requests);
    const totalMs = performance.now() - start;

    const failed = responses.filter((r) => r.status !== 200);
    assert.strictEqual(failed.length, 0, `Fallaron ${failed.length} de ${CONCURRENT_USERS} solicitudes concurrentes`);

    console.log(`CP-02 PASSED: ${CONCURRENT_USERS} solicitudes concurrentes completadas con éxito en ${totalMs.toFixed(2)} ms.`);
}

run().catch((err) => {
    console.error('CP-02 FAILED:', err);
    process.exit(1);
});
