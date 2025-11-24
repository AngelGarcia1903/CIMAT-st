import { Router } from "express";
import {
  iniciarLote,
  registrarPaso,
  getTrazabilidadProducto,
  finalizarLote,
  //  1. Importar la nueva función
  getRegistrosLoteActivoPorLinea,
} from "../controllers/productionController";
import authMiddleware from "../middlewares/authMiddleware";
import adminOrSuperadminMiddleware from "../middlewares/adminMiddleware";

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas POST solo para admin o superadmin
router.post("/iniciar-lote", adminOrSuperadminMiddleware, iniciarLote);
router.post("/finalizar-lote", adminOrSuperadminMiddleware, finalizarLote);

// Rutas accesibles por todos (admin, superadmin, operador)
router.post("/registrar-paso", registrarPaso);
// 2. Ruta eliminada (ya no se usa)
// router.get("/registros/:estacionId", getRegistrosPorEstacion);
//  3. Nueva ruta para el monitor (obtiene todos los registros del lote activo por línea)
router.get("/registros/linea/:lineaId", getRegistrosLoteActivoPorLinea);
router.get("/trazabilidad/:numeroSerie", getTrazabilidadProducto);

export default router;
