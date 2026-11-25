import React, { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch, clearSession, getStoredUser, getToken, saveSession } from './api';

function Layout({ user, onLogout, children }) {
  const location = useLocation();
  const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/propietarios', label: 'Propietarios' },
    { to: '/mascotas', label: 'Mascotas' },
    { to: '/citas/nueva', label: 'Agendar Cita' }
  ];
  if (user?.rol === 'Administrador' || user?.rol === 'Veterinario') {
    navItems.push({ to: '/auditoria', label: 'Auditoría' });
  }

  return (
    <div>
      <header className="topbar">
        <Link to="/dashboard" className="brand">PetCare</Link>
        <nav className="nav-links" aria-label="Navegación principal">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={location.pathname === item.to ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
          <button type="button" className="btn btn-secondary" onClick={onLogout}>
            Cerrar Sesión
          </button>
        </nav>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Debe ingresar correo electrónico y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      saveSession(data.token, data.user);
      onLogin(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-wrapper">
      <section className="card login-card" aria-labelledby="login-heading">
        <h1 id="login-heading">PetCare - Iniciar Sesión</h1>
        <p>Ingrese sus credenciales para acceder a la plataforma veterinaria.</p>

        {error && (
          <div id="login-error" className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@petcare.cl"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </section>
    </main>
  );
}

function DashboardPage({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/dashboard')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section aria-labelledby="dashboard-title">
      <div className="card">
        <h1 id="dashboard-title" data-testid="dashboard-title">
          Bienvenido, {user?.rol} ({user?.nombre})
        </h1>
        <p>Panel de control principal de Clínica Veterinaria PetCare.</p>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {data && (
        <>
          <div className="grid-cards">
            <div className="stat-card">
              <p className="stat-label">Propietarios</p>
              <p className="stat-value">{data.resumen.propietarios}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Mascotas</p>
              <p className="stat-value">{data.resumen.mascotas}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Citas</p>
              <p className="stat-value">{data.resumen.citas}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Consultas</p>
              <p className="stat-value">{data.resumen.consultas}</p>
            </div>
          </div>

          <div className="card">
            <h2>Próximas Citas</h2>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Propietario</th>
                    <th>Mascota</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.proximasCitas.map((cita) => (
                    <tr key={cita.id}>
                      <td>{cita.fecha}</td>
                      <td>{cita.hora}</td>
                      <td>{cita.propietario_nombre}</td>
                      <td>{cita.mascota_nombre}</td>
                      <td>{cita.motivo}</td>
                      <td>{cita.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function CitasPage() {
  const [propietarios, setPropietarios] = useState([]);
  const [mascotas, setMascotas] = useState([]);
  const [citas, setCitas] = useState([]);
  const [propietarioId, setPropietarioId] = useState('');
  const [mascotaId, setMascotaId] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function cargarDatos() {
    const [propsData, citasData] = await Promise.all([
      apiFetch('/api/propietarios'),
      apiFetch('/api/citas')
    ]);
    setPropietarios(propsData);
    setCitas(citasData);
  }

  useEffect(() => {
    cargarDatos().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!propietarioId) {
      setMascotas([]);
      setMascotaId('');
      return;
    }
    apiFetch(`/api/mascotas?propietarioId=${propietarioId}`)
      .then((rows) => {
        setMascotas(rows);
        setMascotaId(rows[0] ? String(rows[0].id) : '');
      })
      .catch((err) => setError(err.message));
  }, [propietarioId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!propietarioId || !mascotaId || !fecha.trim() || !hora.trim() || !motivo.trim()) {
      setError('Existen campos obligatorios incompletos: complete propietario, mascota, fecha, hora y motivo.');
      return;
    }

    try {
      const res = await apiFetch('/api/citas', {
        method: 'POST',
        body: JSON.stringify({
          propietarioId: Number(propietarioId),
          mascotaId: Number(mascotaId),
          fecha,
          hora,
          motivo,
          activa: true
        })
      });
      setSuccess(res.mensaje || 'Cita registrada correctamente');
      setCitas((prev) => [res.cita, ...prev]);
      setMotivo('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section aria-labelledby="citas-heading">
      <div className="card">
        <h1 id="citas-heading">Agendamiento de Citas Veterinarias</h1>

        {error && (
          <div id="cita-error" className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div id="cita-success" className="alert alert-success" role="status">
            {success}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="propietarioId">Propietario</label>
              <select
                id="propietarioId"
                name="propietarioId"
                value={propietarioId}
                onChange={(e) => setPropietarioId(e.target.value)}
              >
                <option value="">Seleccione un propietario</option>
                {propietarios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.rut})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="mascotaId">Mascota</label>
              <select
                id="mascotaId"
                name="mascotaId"
                value={mascotaId}
                onChange={(e) => setMascotaId(e.target.value)}
                disabled={!propietarioId}
              >
                <option value="">Seleccione una mascota</option>
                {mascotas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} ({m.especie})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="fecha">Fecha de la cita</label>
              <input
                id="fecha"
                name="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="hora">Hora de atención</label>
              <input
                id="hora"
                name="hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="motivo">Motivo u observaciones clínicas</label>
            <textarea
              id="motivo"
              name="motivo"
              rows="3"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Control general y revisión de vacunas"
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Guardar Cita
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Listado de Citas</h2>
        <div className="table-responsive">
          <table id="tabla-citas">
            <thead>
              <tr>
                <th>ID</th>
                <th>Propietario</th>
                <th>Mascota</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Motivo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {citas.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.propietario_nombre}</td>
                  <td>{c.mascota_nombre}</td>
                  <td>{c.fecha}</td>
                  <td>{c.hora}</td>
                  <td>{c.motivo}</td>
                  <td>{c.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function PropietariosPage() {
  const [propietarios, setPropietarios] = useState([]);
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiFetch('/api/propietarios').then(setPropietarios).catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!nombre.trim() || !rut.trim() || !email.trim() || !telefono.trim()) {
      setError('Complete todos los campos obligatorios del propietario.');
      return;
    }
    try {
      const created = await apiFetch('/api/propietarios', {
        method: 'POST',
        body: JSON.stringify({ nombre, rut, email, telefono })
      });
      setPropietarios((prev) => [created, ...prev]);
      setNombre('');
      setRut('');
      setEmail('');
      setTelefono('');
      setSuccess('Propietario registrado correctamente');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section aria-labelledby="propietarios-heading">
      <div className="card">
        <h1 id="propietarios-heading">Gestión de Propietarios</h1>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {success && <div className="alert alert-success" role="status">{success}</div>}
        <form noValidate onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="prop-nombre">Nombre completo</label>
              <input id="prop-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="prop-rut">RUT</label>
              <input id="prop-rut" value={rut} onChange={(e) => setRut(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="prop-email">Correo electrónico</label>
              <input id="prop-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="prop-telefono">Teléfono</label>
              <input id="prop-telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Registrar Propietario</button>
        </form>
      </div>

      <div className="card">
        <h2>Propietarios Registrados</h2>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RUT</th>
                <th>Correo</th>
                <th>Teléfono</th>
              </tr>
            </thead>
            <tbody>
              {propietarios.slice(0, 50).map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>{p.rut}</td>
                  <td>{p.email}</td>
                  <td>{p.telefono}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function MascotasPage() {
  const [mascotas, setMascotas] = useState([]);
  const [propietarios, setPropietarios] = useState([]);
  const [propietarioId, setPropietarioId] = useState('');
  const [nombre, setNombre] = useState('');
  const [especie, setEspecie] = useState('');
  const [raza, setRaza] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    Promise.all([apiFetch('/api/mascotas'), apiFetch('/api/propietarios')])
      .then(([m, p]) => {
        setMascotas(m);
        setPropietarios(p);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!propietarioId || !nombre.trim() || !especie.trim()) {
      setError('Complete propietario, nombre y especie de la mascota.');
      return;
    }
    try {
      const created = await apiFetch('/api/mascotas', {
        method: 'POST',
        body: JSON.stringify({ propietarioId: Number(propietarioId), nombre, especie, raza: raza || 'Mestizo' })
      });
      setMascotas((prev) => [created, ...prev]);
      setNombre('');
      setEspecie('');
      setRaza('');
      setSuccess('Mascota registrada correctamente');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section aria-labelledby="mascotas-heading">
      <div className="card">
        <h1 id="mascotas-heading">Registro de Mascotas</h1>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {success && <div className="alert alert-success" role="status">{success}</div>}
        <form noValidate onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="mascota-prop">Propietario</label>
              <select id="mascota-prop" value={propietarioId} onChange={(e) => setPropietarioId(e.target.value)}>
                <option value="">Seleccione un propietario</option>
                {propietarios.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="mascota-nombre">Nombre de la mascota</label>
              <input id="mascota-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="mascota-especie">Especie</label>
              <input id="mascota-especie" value={especie} onChange={(e) => setEspecie(e.target.value)} placeholder="Perro / Gato" />
            </div>
            <div className="form-group">
              <label htmlFor="mascota-raza">Raza</label>
              <input id="mascota-raza" value={raza} onChange={(e) => setRaza(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Registrar Mascota</button>
        </form>
      </div>

      <div className="card">
        <h2>Mascotas Registradas</h2>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Especie</th>
                <th>Raza</th>
                <th>Propietario</th>
              </tr>
            </thead>
            <tbody>
              {mascotas.slice(0, 50).map((m) => (
                <tr key={m.id}>
                  <td>{m.nombre}</td>
                  <td>{m.especie}</td>
                  <td>{m.raza}</td>
                  <td>{m.propietario_nombre || m.propietario_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function AuditoriaPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/auditoria').then(setLogs).catch((err) => setError(err.message));
  }, []);

  return (
    <section aria-labelledby="auditoria-heading">
      <div className="card">
        <h1 id="auditoria-heading">Registros de Auditoría</h1>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Fecha/Hora</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Acción</th>
                <th>Recurso</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.created_at}</td>
                  <td>{l.usuario_email}</td>
                  <td>{l.rol}</td>
                  <td>{l.accion}</td>
                  <td>{l.recurso}</td>
                  <td>{l.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ProtectedRoute({ user, children }) {
  if (!getToken() || !user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());

  function handleLogout() {
    clearSession();
    setUser(null);
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={setUser} />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute user={user}>
            <Layout user={user} onLogout={handleLogout}>
              <DashboardPage user={user} />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/citas/nueva"
        element={
          <ProtectedRoute user={user}>
            <Layout user={user} onLogout={handleLogout}>
              <CitasPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/citas"
        element={
          <ProtectedRoute user={user}>
            <Layout user={user} onLogout={handleLogout}>
              <CitasPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/propietarios"
        element={
          <ProtectedRoute user={user}>
            <Layout user={user} onLogout={handleLogout}>
              <PropietariosPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mascotas"
        element={
          <ProtectedRoute user={user}>
            <Layout user={user} onLogout={handleLogout}>
              <MascotasPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/auditoria"
        element={
          <ProtectedRoute user={user}>
            <Layout user={user} onLogout={handleLogout}>
              <AuditoriaPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
