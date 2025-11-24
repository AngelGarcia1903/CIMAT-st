import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma"; // Importar la instancia única

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.usuario.findUnique({
      where: { username },
    });

    if (!user) {
      // Mensaje genérico para no dar pistas al atacante
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    // --- LÍNEAS DE DIAGNÓSTICO TEMPORALES ---
    // Deja estas líneas por ahora. Una vez que el login funcione con el hash correcto,
    // se recomienda eliminarlas en producción.
    console.log("--- DEBUG LOGIN ---");
    console.log(`Usuario recibido: ${username}`);
    console.log(`Contraseña (Plano) recibida: "${password}"`);
    console.log(`Hash de la BD: ${user.password.substring(0, 30)}...`);
    console.log("-------------------");
    // ----------------------------------------

    // Aquí es donde la aplicación debe comparar el texto plano con el hash de la BD.
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const token = jwt.sign(
      { id: user.id, rol: user.rol },
      process.env.JWT_SECRET || "mi_secreto_super_seguro",
      { expiresIn: "2h" }
    );
    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};
