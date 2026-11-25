const express = require('express');
const path = require('path');
const fs = require('fs');
const authController = require('./controllers/auth');
const propietariosController = require('./controllers/propietarios');
const mascotasController = require('./controllers/mascotas');
const citasController = require('./controllers/citas');
const clinicaController = require('./controllers/clinica');
const { authenticateToken, authorizeRoles } = require('./middleware/auth');

const app = express();
app.disable('x-powered-by');
app.use(express.json());

// CORS para desarrollo con React/Vite en puerto 5173
app.use((req, res, next) => {
    const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    return next();
});

app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// RF-1: Autenticación JWT
app.post('/api/login', authController.login);
app.get('/api/me', authenticateToken, authController.getMe);

// Dashboard
app.get('/api/dashboard', authenticateToken, clinicaController.obtenerDashboard);

// Propietarios CRUD (CP-01, CP-02, CP-08)
app.get('/api/propietarios', authenticateToken, propietariosController.listarPropietarios);
app.get('/api/propietarios/:id', authenticateToken, propietariosController.obtenerPropietario);
app.post('/api/propietarios', authenticateToken, authorizeRoles('Administrador', 'Recepcionista', 'Veterinario'), propietariosController.crearPropietario);
app.put('/api/propietarios/:id', authenticateToken, authorizeRoles('Administrador', 'Recepcionista', 'Veterinario'), propietariosController.actualizarPropietario);
app.delete('/api/propietarios/:id', authenticateToken, authorizeRoles('Administrador', 'Recepcionista'), propietariosController.eliminarPropietario);

// Mascotas CRUD (RF-4, CP-01, CP-02, CP-04)
app.get('/api/mascotas', authenticateToken, mascotasController.listarMascotas);
app.get('/api/mascotas/detalle/:id', authenticateToken, mascotasController.obtenerMascotaPorId);
app.get('/api/mascotas/:propietarioId', authenticateToken, mascotasController.obtenerMascotas);
app.post('/api/mascotas', authenticateToken, authorizeRoles('Administrador', 'Recepcionista', 'Veterinario'), mascotasController.crearMascota);
app.put('/api/mascotas/:id', authenticateToken, authorizeRoles('Administrador', 'Recepcionista', 'Veterinario'), mascotasController.actualizarMascota);
app.delete('/api/mascotas/:id', authenticateToken, authorizeRoles('Administrador', 'Recepcionista'), mascotasController.eliminarMascota);

// Citas CRUD (RF-5, CP-01, CP-08, CP-12)
app.get('/api/citas', authenticateToken, citasController.listarCitas);
app.get('/api/citas/:id', authenticateToken, citasController.obtenerCita);
app.post('/api/citas', authenticateToken, authorizeRoles('Administrador', 'Recepcionista', 'Veterinario'), citasController.crearCita);
app.put('/api/citas/:id', authenticateToken, authorizeRoles('Administrador', 'Recepcionista', 'Veterinario'), citasController.actualizarCita);
app.delete('/api/citas/:id', authenticateToken, authorizeRoles('Administrador', 'Recepcionista', 'Veterinario'), citasController.eliminarCita);

// Consultas clínicas y Vacunas (Solo Veterinario / Administrador según sección 2.2)
app.get('/api/consultas', authenticateToken, clinicaController.listarConsultas);
app.post('/api/consultas', authenticateToken, authorizeRoles('Veterinario', 'Administrador'), clinicaController.crearConsulta);
app.get('/api/vacunas', authenticateToken, clinicaController.listarVacunas);
app.post('/api/vacunas', authenticateToken, authorizeRoles('Veterinario', 'Administrador'), clinicaController.crearVacuna);

// Auditoría
app.get('/api/auditoria', authenticateToken, authorizeRoles('Administrador', 'Veterinario'), clinicaController.listarAuditoria);

// Servir build de producción del frontend si existe
const clientDist = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
    });
}

const PORT = Number(process.env.PORT) || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor PetCare ejecutándose en puerto ${PORT}`);
    });
}

module.exports = app;
