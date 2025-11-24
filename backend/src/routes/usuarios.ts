import { Router } from "express";
import {
  getOperadores,
  getAdmins,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/usuariosController";
import authMiddleware from "../middlewares/authMiddleware";
//  Importar AMBOS middlewares de roles
import superadminMiddleware from "../middlewares/superadminMiddleware";
import adminOrSuperadminMiddleware from "../middlewares/adminMiddleware"; // El que permite admin O superadmin

const router = Router();

// Aplicar autenticación básica a TODAS las rutas de este archivo
router.use(authMiddleware);

// --- Rutas de Lectura ---
// GET /operadores: Accesible por Admin y Superadmin
router.get("/operadores", adminOrSuperadminMiddleware, getOperadores);
// GET /admins: Accesible SOLO por Superadmin
router.get("/admins", superadminMiddleware, getAdmins);

// --- Rutas de Escritura (Crear, Actualizar, Eliminar) ---
// Accesibles SOLO por Superadmin
router.post("/", superadminMiddleware, createUser);
router.put("/:id", superadminMiddleware, updateUser);
router.delete("/:id", superadminMiddleware, deleteUser);

export default router;
