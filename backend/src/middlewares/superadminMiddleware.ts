import { Request, Response, NextFunction } from "express";
import { Rol } from "@prisma/client";

/**
 * Middleware para verificar si el usuario autenticado tiene el rol de 'superadmin'.
 * Debe ejecutarse DESPUÉS de authMiddleware.
 */
const superadminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "No autenticado." });
  }

  if (req.user.rol === Rol.superadmin) {
    next(); // El usuario es superadmin, continúa
  } else {
    res
      .status(403)
      .json({
        message: "Acceso prohibido. Se requiere rol de Superadministrador.",
      });
  }
};

export default superadminMiddleware;
