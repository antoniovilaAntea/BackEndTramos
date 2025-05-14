// routes/tramos.js
const express = require("express");
const router = express.Router();
const db = require("../conexion/conexion"); // importa la conexión a la base de datos

router.get("/", (req, res) => {
  db.all("SELECT * FROM viajes LIMIT 10", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

module.exports = router;
