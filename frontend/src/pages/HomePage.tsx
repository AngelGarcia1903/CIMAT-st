import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProductionLines,
  startNewLote,
  finishActiveLote,
} from "../services/api";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaPlay, FaEye, FaStop } from "react-icons/fa";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

// Definimos una interfaz básica para la forma de los datos de 'linea'
interface LoteInfo {
  id: number;
  nombre: string;
  estado: "PENDIENTE" | "ACTIVO" | "FINALIZADO";
}
interface LineaInfo {
  id: number;
  nombre: string;
  descripcion?: string | null;
  lotes?: LoteInfo[]; // Hacemos lotes opcional por si acaso
}

const HomePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();

  // Especificamos el tipo esperado en useQuery
  const {
    data: lineas,
    isLoading,
    isError,
  } = useQuery<LineaInfo[]>({
    queryKey: ["productionLines"],
    queryFn: getProductionLines,
  });

  // Mutaciones (sin cambios)
  const startLoteMutation = useMutation({
    mutationFn: startNewLote,
    onSuccess: (data) => {
      toast.success(`Nuevo lote iniciado: ${data.nombre}`);
      queryClient.invalidateQueries({ queryKey: ["productionLines"] });
    },
    onError: (error: any) =>
      toast.error(`Error al iniciar lote: ${error.message}`),
  });

  const finishLoteMutation = useMutation({
    mutationFn: finishActiveLote,
    onSuccess: () => {
      toast.success("Lote finalizado correctamente.");
      queryClient.invalidateQueries({ queryKey: ["productionLines"] });
    },
    onError: (error: any) =>
      toast.error(`Error al finalizar lote: ${error.message}`),
  });

  // Renderizado Condicional Temprano
  if (isLoading)
    return <div className="text-center p-8">Cargando líneas...</div>;
  if (isError)
    return (
      <div className="text-center p-8 text-red-500">
        Error al cargar las líneas.
      </div>
    );
  if (!lineas || lineas.length === 0)
    return (
      <div className="text-center p-8 text-gray-500">
        No hay líneas de producción configuradas todavía.
        {userRole === "superadmin" || userRole === "admin" ? (
          <Link to="/lineas" className="text-blue-500 hover:underline ml-2">
            Ir a Configuración
          </Link>
        ) : null}
      </div>
    );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
          Dashboard de Producción
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lineas.map((linea) => {
          // Lógica para encontrar lote activo (más segura con optional chaining)
          const loteActivo = linea.lotes?.find((l) => l.estado === "ACTIVO");

          return (
            <motion.div
              key={linea.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between min-h-[200px]" // Altura mínima para consistencia
            >
              <div>
                <h3
                  className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-2 break-words"
                  title={linea.nombre}
                >
                  {linea.nombre}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm max-h-24 overflow-y-auto">
                  {linea.descripcion || "Sin descripción."}
                </p>
                <div className="text-sm text-gray-500 dark:text-gray-300 border-t dark:border-gray-700 pt-2 mt-2">
                  Lote Activo:{" "}
                  <span className="font-semibold text-green-500 dark:text-green-400 inline-block break-all">
                    {loteActivo?.nombre || "Ninguno"}
                  </span>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-col sm:flex-row justify-end items-center mt-4 space-y-2 sm:space-y-0 sm:space-x-2 w-full">
                {/* Botón Iniciar/Finalizar Lote (Solo Admin/Superadmin) */}
                {(userRole === "admin" || userRole === "superadmin") &&
                  (loteActivo ? (
                    <motion.button
                      onClick={() => finishLoteMutation.mutate(linea.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={finishLoteMutation.isPending}
                      className="py-2 px-4 bg-red-600 text-white rounded-md flex items-center hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 text-sm"
                    >
                      <FaStop className="mr-1" /> Finalizar
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={() => startLoteMutation.mutate(linea.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={startLoteMutation.isPending}
                      className="py-2 px-4 bg-green-600 text-white rounded-md flex items-center hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 text-sm"
                    >
                      <FaPlay className="mr-1" /> Iniciar Lote
                    </motion.button>
                  ))}
                {/* Botón Monitor (Todos los roles) */}
                <div className="w-full sm:w-auto">
                  <Link to={`/monitor/${linea.id}`}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="py-2 px-4 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 transition-colors duration-200 text-sm w-full sm:w-auto"
                    >
                      <FaEye className="mr-1" /> Monitor
                    </motion.button>
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default HomePage;
