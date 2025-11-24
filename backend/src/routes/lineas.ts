import { Router } from "express";
import {
  getLineas,
  createLinea,
  createEstacion,
  deleteResource,
  updateLinea,
  updateEstacion,
  updateParametro,
  getLineaById,
  createEstacionConParametro,
  createParametroParaEstacion,
} from "../controllers/lineasController";
import authMiddleware from "../middlewares/authMiddleware";
import adminMiddleware from "../middlewares/authMiddleware";

const router = Router();
router.use(authMiddleware);

// Rutas Principales
router.get("/", getLineas);
router.post("/", createLinea);

// 2. AÑADIR LA NUEVA RUTA PARA OBTENER POR ID
// Importante: Las rutas con parámetros dinámicos como /:id van DESPUÉS de las rutas con texto fijo como /estaciones
router.get("/:id", getLineaById);

// Rutas para Estaciones
router.post("/estaciones", createEstacion);

// Rutas de Actualización (PUT)
router.put("/:id", updateLinea);
router.put("/estaciones/:id", updateEstacion);
router.put("/parametros/:id", updateParametro);

// Ruta de Eliminación
router.delete("/:resourceType/:id", deleteResource);

// --- Rutas de Configuración (CRUD - Solo para Administradores) ---
// 2. Aplicamos el middleware de admin a las rutas de modificación
router.post("/", adminMiddleware, createLinea);
router.post("/estaciones", adminMiddleware, createEstacion);
router.put("/:id", adminMiddleware, updateLinea);
router.put("/estaciones/:id", adminMiddleware, updateEstacion);
router.put("/parametros/:id", adminMiddleware, updateParametro);
router.delete("/:resourceType/:id", adminMiddleware, deleteResource);

// 👇 AÑADIMOS LAS NUEVAS RUTAS (protegidas por admin)
router.post(
  "/estaciones-con-parametro",
  adminMiddleware,
  createEstacionConParametro
);
router.post(
  "/estaciones/:estacionId/parametros",
  adminMiddleware,
  createParametroParaEstacion
);

export default router;
