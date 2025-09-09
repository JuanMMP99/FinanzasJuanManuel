const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Para producción

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

app.get('/api/gastos', (req, res) => {
  db.all('SELECT * FROM gastos', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/gastos', (req, res) => {
  const { concepto, semanal, mensual } = req.body;
  if (!concepto || semanal == null || mensual == null) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  const sql = 'INSERT INTO gastos (concepto, semanal, mensual) VALUES (?, ?, ?)';
  db.run(sql, [concepto, semanal, mensual], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, concepto, semanal, mensual });
  });
});

app.get('/api/ingresos', (req, res) => {
  db.all('SELECT * FROM ingresos', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/ingresos', (req, res) => {
  const { concepto, semanal, mensual } = req.body;
  if (!concepto || semanal == null || mensual == null) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  const sql = 'INSERT INTO ingresos (concepto, semanal, mensual) VALUES (?, ?, ?)';
  db.run(sql, [concepto, semanal, mensual], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, concepto, semanal, mensual });
  });
});

app.delete('/api/gastos/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM gastos WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Gasto no encontrado' });
    res.json({ message: 'Gasto eliminado', id });
  });
});

app.delete('/api/ingresos/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM ingresos WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Ingreso no encontrado' });
    res.json({ message: 'Ingreso eliminado', id });
  });
});

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});


// Levantar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
