import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getOperadores } from "../services/api"; // Reutilizamos la función de la API
import { motion } from "framer-motion";
import { FaUserCog, FaSpinner, FaUsersSlash } from "react-icons/fa"; // Iconos necesarios

// Interfaz para el tipo de usuario (simplificada)
interface User {
  id: number;
  username: string;
  rol: "admin" | "operador"; // Aunque solo esperamos operadores, mantenemos la interfaz
}

const VerOperadoresPage: React.FC = () => {
  // Query para obtener la lista de operadores
  const {
    data: operadores,
    isLoading,
    isError,
    error,
  } = useQuery<User[], Error>({
    // Especificar Error
    queryKey: ["operadores"], // Usamos la misma key que GestionUsuariosPage para caché
    queryFn: getOperadores,
    refetchOnWindowFocus: false, // No recargar innecesariamente
    staleTime: 1000 * 60 * 5, // Datos frescos por 5 minutos
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* --- TÍTULO RESPONSIVO --- */}
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center">
        <FaUserCog className="mr-3 text-blue-500" /> Vista de Operadores
      </h1>

      <p className="mb-6 text-gray-600 dark:text-gray-400">
        Lista de usuarios con rol de operador registrados en el sistema.
      </p>

      {/* ================================== */}
      {/* 1. VISTA DE TABLA (ESCRITORIO)  */}
      {/* ================================== */}
      <motion.div
        className="hidden md:block overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <table className="min-w-full">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="py-3 px-4 text-left font-semibold text-sm uppercase text-gray-600 dark:text-gray-300">
                ID
              </th>
              <th className="py-3 px-4 text-left font-semibold text-sm uppercase text-gray-600 dark:text-gray-300">
                Username
              </th>
              <th className="py-3 px-4 text-left font-semibold text-sm uppercase text-gray-600 dark:text-gray-300">
                Rol
              </th>
              {/* Futuro: Columna Estado (Online/Offline) */}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td
                  colSpan={3} // Reducido a 3 columnas
                  className="text-center p-6 text-gray-500 dark:text-gray-400"
                >
                  <FaSpinner className="animate-spin text-blue-500 text-2xl mx-auto" />
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={3} className="text-center p-6 text-red-500">
                  Error al cargar: {error?.message || "Desconocido"}
                </td>
              </tr>
            ) : operadores && operadores.length > 0 ? (
              operadores.map((op: User) => (
                <tr
                  key={op.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-200">
                    {op.id}
                  </td>
                  <td className="py-3 px-4 font-medium text-sm text-gray-900 dark:text-white">
                    {op.username}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300">
                      {op.rol}
                    </span>
                  </td>
                  {/* Estado simulado */}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="text-center p-6 text-gray-500 dark:text-gray-400 italic"
                >
                  <FaUsersSlash className="mx-auto text-4xl mb-2 text-gray-400" />
                  No hay operadores registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>

      {/* ================================== */}
      {/* 2. VISTA DE TARJETAS (MÓVIL)     */}
      {/* ================================== */}
      <motion.div
        className="block md:hidden bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {/* Usamos un div interno para padding y para manejar los estados */}
        <div className="p-4">
          {isLoading ? (
            <div className="text-center p-6 text-gray-500 dark:text-gray-400">
              <FaSpinner className="animate-spin text-blue-500 text-2xl mx-auto" />
            </div>
          ) : isError ? (
            <div className="text-center p-6 text-red-500">
              Error al cargar: {error?.message || "Desconocido"}
            </div>
          ) : operadores && operadores.length > 0 ? (
            <div className="space-y-4">
              {" "}
              {/* Contenedor para las tarjetas */}
              {operadores.map((op: User) => (
                <div
                  key={op.id}
                  className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg shadow"
                >
                  {/* Cabecera de la tarjeta */}
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-lg text-gray-900 dark:text-white">
                      {op.username}
                    </span>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300">
                      {op.rol}
                    </span>
                  </div>
                  {/* Footer de la tarjeta */}
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    ID: {op.id}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 text-gray-500 dark:text-gray-400 italic">
              <FaUsersSlash className="mx-auto text-4xl mb-2 text-gray-400" />
              No hay operadores registrados.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default VerOperadoresPage;
