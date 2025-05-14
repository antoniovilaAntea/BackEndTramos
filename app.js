// app.js
const express = require("express");
const cors = require("cors");
const tramosRouter = require("./routes/tramos");

const app = express();
app.use(cors());
app.use(express.json());

// Usar las rutas
app.use("/api/tramos", tramosRouter);

// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
