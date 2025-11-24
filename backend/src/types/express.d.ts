// Extiende la interfaz global de Request de Express
import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";
//  Asegúrate que importa Rol desde el cliente de Prisma
import { Rol } from "@prisma/client";

// Define la estructura que adjuntamos a req.user
export interface UserPayload extends JwtPayload {
  // Exportamos la interfaz
  id: number;
  rol: Rol; // Usamos el Enum de Prisma directamente
}

declare global {
  namespace Express {
    export interface Request {
      user?: UserPayload; // Hacemos 'user' opcional pero con el tipo correcto
    }
  }
}
