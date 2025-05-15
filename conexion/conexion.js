// conexion.js
const express = require("express");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

// PostgreSQL pool
const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT || 5432,
  ssl:
    process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
});

// Middleware
const allowedOrigins = [
  "http://localhost:3000",
  "https://mapa-red-de-carreteras.vercel.app",
  "https://mapa-red-de-carreteras-antoniovilaantea.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir solicitudes sin origen (como aplicaciones móviles o curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));

// Sanitizador de nombre de provincia
const sanitizeProvinceName = (province) => {
  return province
    .replace(/\//g, "-")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N")
    .trim()
    .replace(/\s+/g, "")
    .normalize("NFD")
    .replace(
      /([^n\u0300-\u036f]|n(?!\u0303(?![\u0300-\u036f])))[\u0300-\u036f]+/gi,
      "$1"
    )
    .normalize();
};

// Ruta principal
app.post("/api/d_t/optimized", async (req, res) => {
  const { fecha, provincia } = req.body;

  try {
    const sanitizedProvince = sanitizeProvinceName(provincia);
    const geoJsonPath = path.join(
      process.cwd(),
      "public",
      "nuevos_geojson",
      `${sanitizedProvince}.geojson`
    );

    const provinciaGeoJson = JSON.parse(fs.readFileSync(geoJsonPath));
    const tramosProvincia = provinciaGeoJson.features.map((f) =>
      f.properties.tramo.trim()
    );

    if (tramosProvincia.length === 0) {
      return res.json([]);
    }

    const placeholders = tramosProvincia.map((_, i) => `$${i + 2}`).join(", ");
    const query = `
      SELECT * 
      FROM datos_tramo 
      WHERE fecha = $1 
        AND tramo IN (${placeholders})
    `;

    const result = await pool.query(query, [fecha, ...tramosProvincia]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error obteniendo datos" });
  }
});

const getFechasUnicas = async () => {
  try {
    // Usamos el pool directamente que ya tienes configurado para PostgreSQL
    const result = await pool.query(
      "SELECT DISTINCT fecha FROM datos_tramo ORDER BY fecha DESC"
    );

    // En pg, los resultados están en result.rows
    return result.rows.map((item) => item.fecha.toISOString().split("T")[0]);
  } catch (error) {
    console.error("Error en getFechasUnicas:", error); // Mejor logging
    throw error;
  }
};

// Añade esta ruta GET junto a tu POST existente
app.get("/api/fechas-unicas", async (req, res) => {
  try {
    const fechas = await getFechasUnicas();
    res.json(fechas);
  } catch (error) {
    console.error("Error en /api/fechas-unicas:", error);
    res.status(500).json({ error: "Error al obtener fechas" });
  }
});

app.listen(port, () => {
  console.log(`Servidor en puerto ${port}`);
});
