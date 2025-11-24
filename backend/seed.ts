import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log(`Iniciando el proceso de sembrado de datos...`);

  // --- Creación del Super Administrador ---
  const superAdminUsername = "superadmin";
  const superAdminPassword = "123";

  const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

  const superAdminUser = await prisma.usuario.upsert({
    where: { username: superAdminUsername },
    update: { password: hashedPassword, rol: Rol.superadmin },
    create: {
      username: superAdminUsername,
      password: hashedPassword,
      rol: Rol.superadmin, // Asignando el nuevo rol
    },
  });
  console.log(
    `✅ Usuario '${superAdminUser.username}' (${superAdminUser.rol}) asegurado.`
  );

  // --- Opcional: Eliminar usuarios antiguos si existen (para limpieza) ---
  await prisma.usuario.deleteMany({
    where: {
      username: {
        in: ["admin", "operador"],
      },
    },
  });
  console.log(
    "🧹 Usuarios 'admin' y 'operador' antiguos eliminados (si existían)."
  );

  // --- Creación de Datos de Ejemplo (Línea) ---
  // Mantenemos la línea de ejemplo para pruebas iniciales
}

main()
  .catch((e) => {
    console.error("❌ Error durante el proceso de sembrado:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Proceso de sembrado finalizado.");
  });
