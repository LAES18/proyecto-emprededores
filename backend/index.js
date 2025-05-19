const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Conexión a la base de datos
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'admin',
  database: 'comedor_system',
});

db.connect((err) => {
  if (err) {
    console.error('Error al conectar con MySQL:', err);
    return;
  }
  console.log('Conexión exitosa a MySQL');
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

// Rutas para manejar roles y autenticación
app.post('/register', (req, res) => {
  const { name, email, password, role } = req.body;
  const query = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
  db.query(query, [name, email, password, role], (err) => {
    if (err) {
      res.status(500).send('Error al registrar usuario');
    } else {
      res.status(200).send('Usuario registrado exitosamente');
    }
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
  db.query(query, [email, password], (err, results) => {
    if (err || results.length === 0) {
      res.status(401).send('Credenciales inválidas');
    } else {
      res.status(200).json(results[0]);
    }
  });
});

// Rutas para manejar platillos
app.get('/dishes', (req, res) => {
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

app.post('/dishes', (req, res) => {
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
app.get('/orders', (req, res) => {
  const status = req.query.status;
  let query = `SELECT o.*, GROUP_CONCAT(d.name) as dishes, GROUP_CONCAT(d.type) as types, GROUP_CONCAT(d.price) as prices FROM orders o
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
      const formatted = results.map(r => ({
        ...r,
        dishes: r.dishes ? r.dishes.split(',').map((name, i) => ({
          name,
          type: r.types.split(',')[i],
          price: r.prices.split(',')[i]
        })) : []
      }));
      res.status(200).json(formatted);
    }
  });
});

app.post('/orders', (req, res) => {
  const { dishes, user_id, mesa } = req.body;
  if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
    return res.status(400).send('No se enviaron platillos');
  }
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
app.patch('/orders/:id', (req, res) => {
  const { status } = req.body;
  db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
    if (err) return res.status(500).send('Error al actualizar estado');
    res.status(200).send('Estado actualizado');
  });
});

// Rutas para manejar cobros
app.get('/payments', (req, res) => {
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
app.get('/users', (req, res) => {
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
app.delete('/dishes/:id', (req, res) => {
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

app.post('/payments', (req, res) => {
  const { order_id, total, method } = req.body;
  db.query('INSERT INTO payments (order_id, total, method) VALUES (?, ?, ?)', [order_id, total, method], (err) => {
    if (err) {
      res.status(500).send('Error al registrar pago');
    } else {
      res.status(200).send('Pago registrado exitosamente');
    }
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
