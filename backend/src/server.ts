import express from "express";
import cors from "cors";
import "dotenv/config";
import authRoutes from "./routes/auth";
import lineasRoutes from "./routes/lineas";
import produccionRoutes from "./routes/produccion";
import usuariosRoutes from "./routes/usuarios";
import trazabilidadRoutes from "./routes/trazabilidad";
import { initializeOPCUA } from "./services/opcuaService";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// --- Rutas de la API ---
app.use("/api/auth", authRoutes);
app.use("/api/lineas", lineasRoutes);
app.use("/api/produccion", produccionRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/trazabilidad", trazabilidadRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
  // Inicializar el cliente OPC UA al iniciar el servidor
  initializeOPCUA();
});
