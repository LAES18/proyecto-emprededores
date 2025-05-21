import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Detecta el entorno y configura la URL base del backend
const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? '/api'
    : 'http://localhost:3001/api');

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState(null);

  const toggleForm = () => {
    setIsLogin(!isLogin);
  };

  if (role) {
    return <RoleBasedPage role={role} />;
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              {isLogin ? (
                <LoginForm toggleForm={toggleForm} setRole={setRole} />
              ) : (
                <RegisterForm toggleForm={toggleForm} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ toggleForm, setRole }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Login
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        const data = await response.json();
        setRole(data.role);
      } else {
        alert('Credenciales inválidas');
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <h3 className="text-center">Login</h3>
      <div className="mb-3">
        <label className="form-label">Email o Nombre de Usuario</label>
        <input
          type="text"
          className="form-control"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Password</label>
        <input
          type="password"
          className="form-control"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary w-100">Login</button>
      <p className="text-center mt-3">
        ¿No tienes una cuenta?{' '}
        <span className="text-primary" style={{ cursor: 'pointer' }} onClick={toggleForm}>
          Regístrate
        </span>
      </p>
    </form>
  );
}

function RegisterForm({ toggleForm }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('mesero');

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      // Register
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      if (response.ok) {
        alert('Registro exitoso');
        toggleForm();
      } else {
        alert('Error al registrar usuario');
      }
    } catch (error) {
      console.error('Error al registrar usuario:', error);
    }
  };

  return (
    <form onSubmit={handleRegister}>
      <h3 className="text-center">Registro</h3>
      <div className="mb-3">
        <label className="form-label">Nombre</label>
        <input
          type="text"
          className="form-control"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Email</label>
        <input
          type="email"
          className="form-control"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Password</label>
        <input
          type="password"
          className="form-control"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Rol</label>
        <select
          className="form-control"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        >
          <option value="mesero">Mesero</option>
          <option value="cobrador">Cobrador</option>
          <option value="cocina">Cocina</option>
          <option value="administrador">Administrador</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary w-100">Registrarse</button>
      <p className="text-center mt-3">
        ¿Ya tienes una cuenta?{' '}
        <span className="text-primary" style={{ cursor: 'pointer' }} onClick={toggleForm}>
          Inicia sesión
        </span>
      </p>
    </form>
  );
}

function RoleBasedPage({ role }) {
  const navigate = useNavigate();

  useEffect(() => {
    switch (role) {
      case 'administrador':
        navigate('/admin');
        break;
      case 'mesero':
        navigate('/waiter');
        break;
      case 'cocina':
        navigate('/kitchen');
        break;
      case 'cobrador':
        navigate('/cashier');
        break;
      default:
        navigate('/');
    }
  }, [role, navigate]);

  return null; // Render nothing as the user is being redirected
}

export default App;

// Ejemplo de uso en fetch:
// fetch(`${API_URL}/login`, {...})
// fetch(`${API_URL}/register`, {...})
// fetch(`${API_URL}/dishes`, {...})
// fetch(`${API_URL}/orders`, {...})
// fetch(`${API_URL}/payments`, {...})
// ...etc...
