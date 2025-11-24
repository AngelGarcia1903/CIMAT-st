import { Request, Response } from "express";
import { prisma } from "../prisma";
import { Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Obtiene una lista de usuarios según el rol especificado.
 * Excluye contraseñas.
 */
const getUsersByRole = async (roleToFetch: Rol, res: Response) => {
  try {
    const users = await prisma.usuario.findMany({
      where: { rol: roleToFetch },
      select: { id: true, username: true, rol: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json(users);
  } catch (error) {
    console.error(`Error al obtener ${roleToFetch}es:`, error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

export const getOperadores = async (req: Request, res: Response) => {
  await getUsersByRole(Rol.operador, res);
};

export const getAdmins = async (req: Request, res: Response) => {
  await getUsersByRole(Rol.admin, res);
};

/**
 * Crea un nuevo usuario (admin u operador).
 * Solo el superadmin puede llamar a esto.
 */
export const createUser = async (req: Request, res: Response) => {
  const { username, password, rol } = req.body;

  // Validación básica
  if (!username || !password || !rol) {
    return res
      .status(400)
      .json({ message: "Username, password y rol son obligatorios." });
  }
  if (rol !== Rol.admin && rol !== Rol.operador) {
    return res
      .status(400)
      .json({ message: "El rol debe ser 'admin' u 'operador'." });
  }
  if (rol === Rol.superadmin) {
    return res
      .status(400)
      .json({ message: "No se puede crear otro superadministrador." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.usuario.create({
      data: { username, password: hashedPassword, rol },
      select: { id: true, username: true, rol: true },
    });
    res.status(201).json(newUser);
  } catch (error: any) {
    if (error.code === "P2002" && error.meta?.target?.includes("username")) {
      return res
        .status(409)
        .json({ message: "El nombre de usuario ya existe." });
    }
    console.error("Error al crear usuario:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

// ========================================================================
// 👇 NUEVA FUNCIÓN AÑADIDA: Actualizar Usuario
// ========================================================================
/**
 * Actualiza la información de un usuario existente (admin u operador).
 * Permite cambiar el username, el rol o resetear la contraseña.
 * Solo el superadmin puede llamar a esto.
 */
export const updateUser = async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);
  const { username, rol, password } = req.body; // Password es opcional para reseteo

  if (isNaN(userId)) {
    return res.status(400).json({ message: "ID de usuario inválido." });
  }

  // Validación del rol (si se proporciona)
  if (rol && rol !== Rol.admin && rol !== Rol.operador) {
    return res
      .status(400)
      .json({ message: "El rol debe ser 'admin' u 'operador'." });
  }

  try {
    const dataToUpdate: any = {};
    if (username) dataToUpdate.username = username;
    if (rol) dataToUpdate.rol = rol;
    if (password) {
      // Si se proporciona una contraseña, la hasheamos para el reseteo
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    // Verificar que el usuario a actualizar no sea el superadmin (protección)
    const userToUpdate = await prisma.usuario.findUnique({
      where: { id: userId },
    });
    if (!userToUpdate) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    if (userToUpdate.rol === Rol.superadmin) {
      return res
        .status(403)
        .json({ message: "No se puede modificar al superadministrador." });
    }

    const updatedUser = await prisma.usuario.update({
      where: { id: userId },
      data: dataToUpdate,
      select: { id: true, username: true, rol: true }, // No devolver contraseña
    });

    res.status(200).json(updatedUser);
  } catch (error: any) {
    if (error.code === "P2002" && error.meta?.target?.includes("username")) {
      return res
        .status(409)
        .json({ message: "El nuevo nombre de usuario ya existe." });
    }
    if (error.code === "P2025") {
      // Error si el usuario no se encuentra para actualizar
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    console.error("Error al actualizar usuario:", error);
    res
      .status(500)
      .json({ message: "Error en el servidor al actualizar usuario." });
  }
};

// ========================================================================
// 👇 NUEVA FUNCIÓN AÑADIDA: Eliminar Usuario
// ========================================================================
/**
 * Elimina un usuario existente (admin u operador).
 * Solo el superadmin puede llamar a esto.
 */
export const deleteUser = async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ message: "ID de usuario inválido." });
  }

  try {
    // Verificar que el usuario a eliminar no sea el superadmin
    const userToDelete = await prisma.usuario.findUnique({
      where: { id: userId },
    });
    if (!userToDelete) {
      // Si no existe, consideramos la eliminación exitosa (idempotencia)
      return res.status(204).send();
    }
    if (userToDelete.rol === Rol.superadmin) {
      return res
        .status(403)
        .json({ message: "No se puede eliminar al superadministrador." });
    }

    await prisma.usuario.delete({
      where: { id: userId },
    });

    res.status(204).send(); // 204 No Content: Éxito sin cuerpo de respuesta
  } catch (error: any) {
    if (error.code === "P2025") {
      // Error si el usuario no se encuentra para eliminar
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    console.error("Error al eliminar usuario:", error);
    res
      .status(500)
      .json({ message: "Error en el servidor al eliminar usuario." });
  }
};
