import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Rol } from "@prisma/client";
// Importa el tipo específico que definimos globalmente
import { UserPayload } from "../types/express";

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Acceso denegado. No se proporcionó token." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "clave_super_secreta"
    ) as jwt.JwtPayload;

    // Validación explícita de la estructura y el rol
    if (
      !decoded ||
      typeof decoded !== "object" ||
      typeof decoded.id !== "number" ||
      typeof decoded.rol !== "string" ||
      !Object.values(Rol).includes(decoded.rol as Rol)
    ) {
      throw new Error("Token inválido o estructura/rol incorrecto.");
    }

    // Adjuntamos el payload validado como UserPayload
    req.user = decoded as UserPayload;

    next();
  } catch (error) {
    console.error(
      "Error de autenticación:",
      error instanceof Error ? error.message : error
    );
    res.status(401).json({ message: "Token inválido o expirado." });
  }
};

export default authMiddleware;
