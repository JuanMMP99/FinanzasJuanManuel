const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Crear o abrir base de datos SQLite
const db = new sqlite3.Database('./finanzas.db', (err) => {
  if (err) {
    console.error('Error al abrir la base de datos', err.message);
  } else {
    console.log('Base de datos conectada');
  }
});

// Crear tablas si no existen
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    concepto TEXT NOT NULL,
    semanal REAL NOT NULL,
    mensual REAL NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ingresos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    concepto TEXT NOT NULL,
    semanal REAL NOT NULL,
    mensual REAL NOT NULL
  )`);
});

// Rutas API

// Obtener todos los gastos
app.get('/api/gastos', (req, res) => {
  db.all('SELECT * FROM gastos', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Agregar un gasto
app.post('/api/gastos', (req, res) => {
  const { concepto, semanal, mensual } = req.body;
  if (!concepto || semanal == null || mensual == null) {
    res.status(400).json({ error: 'Faltan datos' });
    return;
  }
  const sql = 'INSERT INTO gastos (concepto, semanal, mensual) VALUES (?, ?, ?)';
  db.run(sql, [concepto, semanal, mensual], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, concepto, semanal, mensual });
  });
});

// Obtener todos los ingresos
app.get('/api/ingresos', (req, res) => {
  db.all('SELECT * FROM ingresos', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Agregar un ingreso
app.post('/api/ingresos', (req, res) => {
  const { concepto, semanal, mensual } = req.body;
  if (!concepto || semanal == null || mensual == null) {
    res.status(400).json({ error: 'Faltan datos' });
    return;
  }
  const sql = 'INSERT INTO ingresos (concepto, semanal, mensual) VALUES (?, ?, ?)';
  db.run(sql, [concepto, semanal, mensual], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, concepto, semanal, mensual });
  });
});

// Servir frontend estático (opcional)
// app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
