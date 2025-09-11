const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_super_segura_cambiala_en_produccion';

app.use(cors());
app.use(bodyParser.json());

// Crear o abrir base de datos SQLite
const db = new sqlite3.Database(path.join(__dirname, 'finanzas.db'), (err) => {
  if (err) {
    console.error('Error al abrir la base de datos', err.message);
  } else {
    console.log('Base de datos conectada');
  }
});

// Crear tablas
db.serialize(() => {
  // Tabla de usuarios
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabla de gastos con relación a usuario
  db.run(`CREATE TABLE IF NOT EXISTS gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    concepto TEXT NOT NULL,
    semanal REAL NOT NULL,
    mensual REAL NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
  )`);

  // Tabla de ingresos con relación a usuario
  db.run(`CREATE TABLE IF NOT EXISTS ingresos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    concepto TEXT NOT NULL,
    semanal REAL NOT NULL,
    mensual REAL NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
  )`);
});

// Crear tablas
db.serialize(() => {
  // Tabla de usuarios (existente)
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabla de gastos con relación a usuario (existente)
  db.run(`CREATE TABLE IF NOT EXISTS gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    concepto TEXT NOT NULL,
    semanal REAL NOT NULL,
    mensual REAL NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
  )`);

  // Tabla de ingresos con relación a usuario (existente)
  db.run(`CREATE TABLE IF NOT EXISTS ingresos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    concepto TEXT NOT NULL,
    semanal REAL NOT NULL,
    mensual REAL NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
  )`);

  // Tabla de despensa (NUEVA)
  db.run(`CREATE TABLE IF NOT EXISTS despensa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    cantidad REAL NOT NULL,
    unidad TEXT NOT NULL DEFAULT 'unidades',
    precio REAL DEFAULT 0,
    fecha_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
    duracion INTEGER NOT NULL,
    terminado BOOLEAN DEFAULT 0,
    fecha_terminado DATETIME,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
  )`);
});

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Rutas de autenticación
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar si el usuario ya existe
    db.get('SELECT id FROM usuarios WHERE email = ?', [email], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Error en la base de datos' });
      }
      
      if (row) {
        return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
      }

      // Hashear la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insertar el nuevo usuario
      const sql = 'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)';
      db.run(sql, [nombre, email, hashedPassword], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error al crear el usuario' });
        }
        
        res.status(201).json({ 
          message: 'Usuario creado exitosamente',
          userId: this.lastID 
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Buscar usuario por email
    db.get('SELECT * FROM usuarios WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Error en la base de datos' });
      }

      if (!user) {
        return res.status(400).json({ error: 'Credenciales inválidas' });
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Credenciales inválidas' });
      }

      // Generar JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: {
      id: req.user.userId,
      email: req.user.email
    }
  });
});

// Rutas protegidas para gastos
app.get('/api/gastos', authenticateToken, (req, res) => {
  db.all('SELECT * FROM gastos WHERE usuario_id = ? ORDER BY fecha_creacion DESC', 
    [req.user.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/gastos', authenticateToken, (req, res) => {
  const { concepto, semanal, mensual } = req.body;
  if (!concepto || semanal == null || mensual == null) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  const sql = 'INSERT INTO gastos (usuario_id, concepto, semanal, mensual) VALUES (?, ?, ?, ?)';
  db.run(sql, [req.user.userId, concepto, semanal, mensual], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, concepto, semanal, mensual });
  });
});

app.delete('/api/gastos/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM gastos WHERE id = ? AND usuario_id = ?', 
    [id, req.user.userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Gasto no encontrado' });
    res.json({ message: 'Gasto eliminado', id });
  });
});

// Rutas protegidas para ingresos
app.get('/api/ingresos', authenticateToken, (req, res) => {
  db.all('SELECT * FROM ingresos WHERE usuario_id = ? ORDER BY fecha_creacion DESC', 
    [req.user.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/ingresos', authenticateToken, (req, res) => {
  const { concepto, semanal, mensual } = req.body;
  if (!concepto || semanal == null || mensual == null) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  const sql = 'INSERT INTO ingresos (usuario_id, concepto, semanal, mensual) VALUES (?, ?, ?, ?)';
  db.run(sql, [req.user.userId, concepto, semanal, mensual], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, concepto, semanal, mensual });
  });
});

app.delete('/api/ingresos/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM ingresos WHERE id = ? AND usuario_id = ?', 
    [id, req.user.userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Ingreso no encontrado' });
    res.json({ message: 'Ingreso eliminado', id });
  });
});

// Ruta para obtener información del usuario
app.get('/api/user/profile', authenticateToken, (req, res) => {
  db.get('SELECT id, nombre, email, fecha_registro FROM usuarios WHERE id = ?', 
    [req.user.userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  });
});

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Ruta para el login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

// Ruta principal (protegida)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Rutas para la despensa
app.get('/api/despensa', authenticateToken, (req, res) => {
  db.all('SELECT * FROM despensa WHERE usuario_id = ? ORDER BY fecha_creacion DESC', 
    [req.user.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/despensa', authenticateToken, (req, res) => {
  const { nombre, cantidad, unidad, precio, fechaCompra, duracion, terminado } = req.body;
  
  if (!nombre || cantidad == null || duracion == null) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }
  
  const sql = `INSERT INTO despensa 
               (usuario_id, nombre, cantidad, unidad, precio, fecha_compra, duracion, terminado) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [
    req.user.userId, 
    nombre, 
    cantidad, 
    unidad || 'unidades', 
    precio || 0, 
    fechaCompra || new Date().toISOString(), 
    duracion,
    terminado || 0
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Devolver el producto recién creado
    db.get('SELECT * FROM despensa WHERE id = ?', [this.lastID], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json(row);
    });
  });
});

app.put('/api/despensa/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { nombre, cantidad, unidad, precio, fechaCompra, duracion, terminado, fechaTerminado } = req.body;
  
  // Verificar que el producto pertenece al usuario
  db.get('SELECT id FROM despensa WHERE id = ? AND usuario_id = ?', [id, req.user.userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Producto no encontrado' });
    
    const sql = `UPDATE despensa 
                 SET nombre = ?, cantidad = ?, unidad = ?, precio = ?, 
                     fecha_compra = ?, duracion = ?, terminado = ?, fecha_terminado = ?
                 WHERE id = ?`;
    
    db.run(sql, [
      nombre, cantidad, unidad, precio, fechaCompra, duracion, 
      terminado ? 1 : 0, fechaTerminado, id
    ], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Devolver el producto actualizado
      db.get('SELECT * FROM despensa WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      });
    });
  });
});

app.delete('/api/despensa/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM despensa WHERE id = ? AND usuario_id = ?', 
    [id, req.user.userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado', id });
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

// Levantar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});