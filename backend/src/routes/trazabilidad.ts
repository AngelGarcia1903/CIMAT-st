import { Router } from "express";
// 👇 1. Importar ambas funciones del controlador
import {
  buscarRegistros,
  getFechasDisponibles,
  getFallasPorProducto, // <-- Función añadida
} from "../controllers/trazabilidadController";
import authMiddleware from "../middlewares/authMiddleware";

const router = Router();

// Todas las rutas de trazabilidad requieren que el usuario esté autenticado
router.use(authMiddleware);

// Define la ruta GET para las búsquedas avanzadas
// Espera query parameters como ?año=2025&mes=10&numeroSerie=XYZ
router.get("/buscar", buscarRegistros);

//  2. NUEVA RUTA: Ruta GET para obtener los años/meses con registros
router.get("/fechas-disponibles", getFechasDisponibles);

// NUEVA RUTA: Obtener historial de fallas de un producto específico
router.get("/fallas/:productoId", getFallasPorProducto);
export default router;
