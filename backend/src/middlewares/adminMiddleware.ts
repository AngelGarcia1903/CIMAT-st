import { Request, Response, NextFunction } from "express";
import { Rol } from "@prisma/client"; // Ensure Rol is imported correctly

/**
 * Middleware to check if the authenticated user has 'admin' or 'superadmin' role.
 * Must run AFTER authMiddleware.
 */
const adminOrSuperadminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check if req.user exists and has the rol property
  // Use a type guard for extra safety, although express.d.ts should handle this
  if (!req.user || typeof req.user.rol === "undefined") {
    return res
      .status(401)
      .json({ message: "No autenticado o rol no definido." });
  }

  // Explicitly reference the user's role
  const userRole: Rol = req.user.rol;

  // Check if the role is either admin OR superadmin using the imported Enum
  if (userRole === Rol.admin || userRole === Rol.superadmin) {
    next(); // User has required permissions
  } else {
    // User is authenticated but does not have the required role
    res.status(403).json({
      message: "Acceso prohibido. Se requiere rol de Administrador o superior.",
    });
  }
};

export default adminOrSuperadminMiddleware;
