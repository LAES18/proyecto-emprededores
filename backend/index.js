require('dotenv').config(); // Carga variables de entorno desde .env

const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 53929;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Conexión a la base de datos usando variables de entorno para compatibilidad Railway/local
const db = mysql.createConnection({
  host: process.env.MYSQLHOST || 'tramway.proxy.rlwy.net',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || ':biNuurNEajxKdCHkUdFbiXgJyLoEEjDm',
  database: process.env.MYSQLDATABASE || 'railway',
  port: process.env.MYSQLPORT ? parseInt(process.env.MYSQLPORT) : 53929
});

db.connect((err) => {
  if (err) {
    console.error('Error al conectar con MySQL:', err);
    return;
  }
  console.log('Conexión exitosa a MySQL Railway');
});

// Inicializar base de datos
const initializeDatabase = () => {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('administrador', 'mesero', 'cocina', 'cobrador') NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS dishes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type ENUM('desayuno', 'almuerzo', 'cena') NOT NULL,
      price DECIMAL(10, 2) NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      status ENUM('pendiente', 'en_proceso', 'servido') DEFAULT 'pendiente',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      mesa VARCHAR(10),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );`,
    `CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      method VARCHAR(50),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );`,
  ];

  queries.forEach((query) => {
    db.query(query, (err) => {
      if (err) {
        console.error('Error al inicializar la base de datos:', err);
      }
    });
  });
};

initializeDatabase();

// Eliminar columna dish_id de orders si existe (solo la primera vez)
db.query("SHOW COLUMNS FROM orders LIKE 'dish_id'", (err, results) => {
  if (!err && results.length > 0) {
    db.query("ALTER TABLE orders DROP COLUMN dish_id", (err2) => {
      if (err2) {
        console.error('No se pudo eliminar dish_id de orders:', err2);
      } else {
        console.log('Columna dish_id eliminada de orders');
      }
    });
  }
});

// Modificaciones para soportar órdenes con múltiples platillos y mesa
const alterQueries = [
  `ALTER TABLE orders ADD COLUMN mesa VARCHAR(10)`,
  `ALTER TABLE payments ADD COLUMN method VARCHAR(50)`
];

alterQueries.forEach((query) => {
  db.query(query, (err) => {
    // Ignorar errores si la columna ya existe
  });
});

// Crear tabla intermedia para items de la orden
const createOrderItems = `CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  dish_id INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (dish_id) REFERENCES dishes(id)
);`;
db.query(createOrderItems, (err) => {
  if (err) {
    console.error('Error al crear tabla order_items:', err);
  }
});

// Asegura que el ENUM de 'role' en users sea correcto al iniciar el backend SOLO si es necesario
const checkRoleEnum = `SHOW COLUMNS FROM users LIKE 'role';`;
db.query(checkRoleEnum, (err, results) => {
  if (!err && results && results[0]) {
    const type = results[0].Type;
    if (!type.includes("'administrador'") || !type.includes("'mesero'") || !type.includes("'cocina'") || !type.includes("'cobrador'")) {
      const alterRoleEnum = `ALTER TABLE users MODIFY COLUMN role ENUM('administrador', 'mesero', 'cocina', 'cobrador') NOT NULL;`;
      db.query(alterRoleEnum, (err2) => {
        if (err2) {
          console.error("Error al actualizar el tipo ENUM de 'role' en la tabla 'users':", err2);
        } else {
          console.log("Tipo ENUM de 'role' en la tabla 'users' actualizado correctamente.");
        }
      });
    } else {
      console.log("El ENUM de 'role' ya es correcto.");
    }
  } else if (err) {
    console.error("Error al verificar el tipo ENUM de 'role':", err);
  }
});

// Prefijo para todas las rutas de API
const api = express.Router();

// Log global para todas las peticiones a /api/*
api.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl} - Body:`, req.body);
  next();
});

// Rutas para manejar roles y autenticación
api.post('/register', (req, res) => {
  const { name, email, password, role } = req.body;

  // Log de los datos recibidos
  console.log('Intentando registrar usuario:', { name, email, password, role });

  // Validar que todos los campos estén presentes
  if (!name || !email || !password || !role) {
    console.log('Faltan campos en el registro:', req.body);
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  // Validar formato del correo electrónico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log('Formato de correo inválido:', email);
    return res.status(400).json({ error: 'Formato de correo electrónico inválido' });
  }

  // Validar que el rol sea uno de los permitidos
  const allowedRoles = ['administrador', 'mesero', 'cocina', 'cobrador'];
  if (!allowedRoles.includes(role)) {
    console.log('Rol inválido:', role);
    return res.status(400).json({ error: `Rol inválido. Debe ser uno de: ${allowedRoles.join(', ')}` });
  }

  const query = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
  db.query(query, [name, email, password, role], (err) => {
    if (err) {
      console.error('Error al registrar usuario:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'El correo electrónico ya está registrado', details: err.sqlMessage });
      }
      // Mostrar el error SQL exacto para depuración
      return res.status(500).json({ error: 'Error al registrar usuario', details: err.sqlMessage || err.message || err });
    }
    res.status(200).send('Usuario registrado exitosamente');
  });
});

api.post('/login', (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT * FROM users WHERE (email = ? OR name = ?) AND password = ?';
  db.query(query, [email, email, password], (err, results) => {
    if (err || results.length === 0) {
      res.status(401).send('Credenciales inválidas');
    } else {
      res.status(200).json(results[0]);
    }
  });
});

// Rutas para manejar platillos
api.get('/dishes', (req, res) => {
  const type = req.query.type;
  let query = 'SELECT * FROM dishes';
  const params = [];
  if (type && ['desayuno', 'almuerzo', 'cena'].includes(type)) {
    query += ' WHERE type = ?';
    params.push(type);
  }
  db.query(query, params, (err, results) => {
    if (err) {
      res.status(500).send('Error al obtener platillos');
    } else {
      res.status(200).json(results);
    }
  });
});

api.post('/dishes', (req, res) => {
  const { name, type, price } = req.body;
  const query = 'INSERT INTO dishes (name, type, price) VALUES (?, ?, ?)';
  db.query(query, [name, type, price], (err) => {
    if (err) {
      res.status(500).send('Error al agregar platillo');
    } else {
      res.status(200).send('Platillo agregado exitosamente');
    }
  });
});

// Rutas para manejar órdenes
api.get('/orders', (req, res) => {
  const status = req.query.status;
  let query = `SELECT o.*, GROUP_CONCAT(d.name ORDER BY oi.id) as dishes, GROUP_CONCAT(d.type ORDER BY oi.id) as types, GROUP_CONCAT(d.price ORDER BY oi.id) as prices FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN dishes d ON oi.dish_id = d.id`;
  const params = [];

  if (status) {
    query += ` WHERE o.status = ?`;
    params.push(status);
  }

  query += ' GROUP BY o.id ORDER BY o.created_at ASC, o.mesa ASC';

  db.query(query, params, (err, results) => {
    if (err) {
      res.status(500).send('Error al obtener órdenes');
    } else {
      // Asegura que los campos dishes/types/prices sean arrays y price sea numérico
      const formatted = results.map(r => {
        let dishesArr = [], typesArr = [], pricesArr = [];
        if (r.dishes && r.types && r.prices) {
          dishesArr = r.dishes.split(',');
          typesArr = r.types.split(',');
          pricesArr = r.prices.split(',');
        }
        return {
          ...r,
          dishes: dishesArr.map((name, i) => ({
            name,
            type: typesArr[i],
            price: parseFloat(pricesArr[i])
          }))
        };
      });
      res.status(200).json(formatted);
    }
  });
});

api.post('/orders', (req, res) => {
  const { dishes, user_id, mesa } = req.body;
  if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
    return res.status(400).send('No se enviaron platillos');
  }
  // Revertir el cambio para que el estado inicial no sea 'servido'
  const orderQuery = 'INSERT INTO orders (user_id, mesa) VALUES (?, ?)';
  db.query(orderQuery, [user_id, mesa], (err, result) => {
    if (err) return res.status(500).send('Error al crear orden');
    const orderId = result.insertId;
    const items = dishes.map(d => [orderId, d.dish_id]);
    db.query('INSERT INTO order_items (order_id, dish_id) VALUES ?', [items], (err2) => {
      if (err2) return res.status(500).send('Error al agregar platillos a la orden');
      res.status(200).json({ orderId });
    });
  });
});

// Actualizar estado de la orden (para cocina)
api.patch('/orders/:id', (req, res) => {
  const { status } = req.body;
  db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
    if (err) return res.status(500).send('Error al actualizar estado');
    res.status(200).send('Estado actualizado');
  });
});

// Rutas para manejar cobros
api.get('/payments', (req, res) => {
  const query = 'SELECT * FROM payments';
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).send('Error al obtener pagos');
    } else {
      res.status(200).json(results);
    }
  });
});

// Endpoint to fetch all users
api.get('/users', (req, res) => {
  const query = 'SELECT id, name, email, role FROM users';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ error: 'Failed to fetch users' });
    } else {
      res.json(results);
    }
  });
});

// Ruta para eliminar un platillo
api.delete('/dishes/:id', (req, res) => {
  const dishId = req.params.id;

  // Eliminar referencias en la tabla order_items
  const deleteOrderItemsQuery = 'DELETE FROM order_items WHERE dish_id = ?';
  db.query(deleteOrderItemsQuery, [dishId], (err) => {
    if (err) {
      return res.status(500).send('Error al eliminar referencias del platillo en order_items');
    }

    // Eliminar el platillo después de eliminar las referencias
    const deleteDishQuery = 'DELETE FROM dishes WHERE id = ?';
    db.query(deleteDishQuery, [dishId], (err2, result) => {
      if (err2) {
        return res.status(500).send('Error al eliminar el platillo');
      } else if (result.affectedRows === 0) {
        return res.status(404).send('Platillo no encontrado');
      } else {
        return res.status(200).send('Platillo eliminado exitosamente');
      }
    });
  });
});

// Ruta para eliminar un usuario
api.delete('/users/:id', (req, res) => {
  const userId = req.params.id;

  const deleteUserQuery = 'DELETE FROM users WHERE id = ?';
  db.query(deleteUserQuery, [userId], (err, result) => {
    if (err) {
      console.error('Error al eliminar usuario:', err);
      return res.status(500).send('Error al eliminar usuario');
    } else if (result.affectedRows === 0) {
      return res.status(404).send('Usuario no encontrado');
    } else {
      return res.status(200).send('Usuario eliminado exitosamente');
    }
  });
});

// Actualizar la lógica del backend para manejar el estado 'pagado'
api.post('/payments', (req, res) => {
  const payments = req.body;

  console.log('Received Payments:', payments); // Debugging log

  if (!Array.isArray(payments) || payments.length === 0) {
    console.error('No se enviaron pagos'); // Debugging log
    return res.status(400).send('No se enviaron pagos');
  }

  // Validar que cada pago tenga las claves necesarias
  for (const payment of payments) {
    if (!payment.order_id || !payment.total || !payment.method) {
      console.error('Datos de pago inválidos:', payment); // Debugging log
      return res.status(400).send('Datos de pago inválidos');
    }
  }

  const paymentQueries = payments.map(payment => {
    return new Promise((resolve, reject) => {
      const { order_id, total, method } = payment;
      console.log('Processing Payment:', payment); // Debugging log
      db.query('INSERT INTO payments (order_id, total, method) VALUES (?, ?, ?)', [order_id, total, method], (err) => {
        if (err) {
          console.error('Error al insertar pago:', err, 'Payment Data:', payment); // Debugging log
          reject(err);
        } else {
          // Cambiar el estado de la orden a 'pagado'
          db.query('UPDATE orders SET status = ? WHERE id = ?', ['pagado', order_id], (err2) => {
            if (err2) {
              console.error('Error al actualizar estado de orden:', err2, 'Order ID:', order_id); // Debugging log
              reject(err2);
            } else {
              resolve();
            }
          });
        }
      });
    });
  });

  Promise.all(paymentQueries)
    .then(() => res.status(200).send('Pagos procesados exitosamente'))
    .catch(err => {
      console.error('Error al procesar pagos:', err); // Debugging log
      res.status(500).send('Error al procesar pagos');
    });
});

// Actualizar la inicialización de la base de datos para incluir 'pagado' en el tipo ENUM de 'status'
const alterStatusEnum = `ALTER TABLE orders MODIFY COLUMN status ENUM('pendiente', 'en_proceso', 'servido', 'pagado') DEFAULT 'pendiente';`;
db.query(alterStatusEnum, (err) => {
  if (err) {
    console.error("Error al actualizar el tipo ENUM de 'status' en la tabla 'orders':", err);
  } else {
    console.log("Tipo ENUM de 'status' en la tabla 'orders' actualizado correctamente.");
  }
});

// Ruta para actualizar detalles de usuario por ID
api.put('/users/:id', (req, res) => {
  const { name, email, password, role } = req.body;
  const userId = req.params.id;

  // Validar que todos los campos estén presentes
  if (!name || !email || !password || !role) {
    return res.status(400).send('Todos los campos son obligatorios');
  }

  const query = 'UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE id = ?';
  db.query(query, [name, email, password, role, userId], (err, result) => {
    if (err) {
      console.error('Error al actualizar usuario:', err);
      return res.status(500).send('Error al actualizar usuario');
    } else if (result.affectedRows === 0) {
      return res.status(404).send('Usuario no encontrado');
    } else {
      return res.status(200).send('Usuario actualizado exitosamente');
    }
  });
});

// Usar el prefijo /api para todas las rutas de API
app.use('/api', api);

// Handler para rutas de API no encontradas (debug 404 vs 405)
app.use('/api/*', (req, res) => {
  console.log('API route not found:', req.method, req.originalUrl);
  res.status(404).json({ error: 'API route not found' });
});

// Servir archivos estáticos del frontend (Vite build)
app.use(express.static(path.join(__dirname, '../dist')));

// Para cualquier método que no sea GET en rutas que no sean /api, responde 405 explícito
app.all(/^\/(?!api).*/, (req, res, next) => {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }
  next();
});

// Para cualquier ruta GET que no sea API, devolver index.html (SPA)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});