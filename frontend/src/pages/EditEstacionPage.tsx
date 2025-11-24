import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductionLineById, updateStation } from "../services/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { FaSave, FaArrowLeft, FaSpinner } from "react-icons/fa"; // Añadir FaSpinner

// Interfaces
interface EstacionData {
  id: number;
  nombreEstacion: string;
  orden: number;
}
interface LineaParaContexto {
  id: number; // Necesitamos el ID de la línea
  nombre: string;
  estaciones: EstacionData[];
}

const EditEstacionPage: React.FC = () => {
  const { lineaId, estacionId } = useParams<{
    lineaId: string;
    estacionId: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [nombreEstacion, setNombreEstacion] = useState("");
  const [orden, setOrden] = useState<number | "">("");
  const [nombreLinea, setNombreLinea] = useState("");

  // Query para obtener datos de la LÍNEA (para encontrar la estación)
  const {
    data: linea,
    isLoading,
    isError,
    error,
  } = useQuery<LineaParaContexto, Error>({
    queryKey: ["lineaDetails", lineaId], // Query por ID de línea
    queryFn: () => getProductionLineById(lineaId!),
    enabled: !!lineaId && !!estacionId,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });

  // Derivar la estación específica DESPUÉS de que 'linea' se haya cargado
  const [estacion, setEstacion] = useState<EstacionData | null>(null);

  useEffect(() => {
    if (linea && estacionId) {
      const foundEstacion = linea.estaciones.find(
        (e) => e.id === parseInt(estacionId)
      );
      if (foundEstacion) {
        setEstacion(foundEstacion);
        setNombreEstacion(foundEstacion.nombreEstacion);
        setOrden(foundEstacion.orden);
        setNombreLinea(linea.nombre);
      } else {
        // Si la estación no se encuentra en la línea cargada
        setEstacion(null); // Marcar como no encontrada
      }
    }
  }, [linea, estacionId]); // Depende de ambos

  // Mutación para guardar cambios
  const updateMutation = useMutation({
    mutationFn: (updatedData: { nombreEstacion: string; orden: number }) =>
      updateStation(estacionId!, updatedData),
    onSuccess: () => {
      toast.success("Estación actualizada.");
      queryClient.invalidateQueries({ queryKey: ["lineas"] });
      queryClient.invalidateQueries({ queryKey: ["lineaDetails", lineaId] });
      navigate("/lineas");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.response?.data?.message || error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof orden !== "number" || orden <= 0) {
      toast.error("Orden debe ser número positivo.");
      return;
    }
    if (!nombreEstacion.trim()) {
      toast.error("Nombre no puede estar vacío.");
      return;
    }
    updateMutation.mutate({ nombreEstacion, orden });
  };

  // --- Renderizado Condicional Mejorado ---
  if (isLoading) {
    // Muestra carga mientras busca la línea
    return (
      <div className="flex justify-center items-center h-screen">
        <FaSpinner className="animate-spin text-blue-500 text-4xl" />
        <span className="ml-3 text-gray-500">
          Cargando datos de la estación...
        </span>
      </div>
    );
  }
  if (isError) {
    // Error al buscar la línea
    return (
      <div className="p-8 text-center text-red-500">
        Error al cargar datos: {error?.message || "Desconocido"}
      </div>
    );
  }
  // Si la línea cargó pero la estación no se encontró dentro de ella
  if (linea && !estacion) {
    return (
      <div className="p-8 text-center text-orange-500">
        Estación no encontrada en la línea especificada.
      </div>
    );
  }
  // Si la línea no cargó por alguna razón (ej. lineaId inválido)
  if (!linea) {
    return (
      <div className="p-8 text-center text-orange-500">
        Línea no encontrada.
      </div>
    );
  }
  // --- Fin Renderizado Condicional ---

  // Si llegamos aquí, 'estacion' existe y no hay error
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700"
    >
      <h1 className="text-3xl font-bold text-center text-blue-600 dark:text-blue-400 mb-2">
        Editar Estación:{" "}
        <span className="italic">
          {estacion ? estacion.nombreEstacion : ""}
        </span>{" "}
        {/* Seguro acceder */}
      </h1>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
        (Línea: {nombreLinea})
      </p>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campos del formulario (sin cambios) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nombre
          </label>
          <input
            type="text"
            maxLength={50}
            value={nombreEstacion}
            onChange={(e) => setNombreEstacion(e.target.value)}
            required
            className="w-full p-3 mt-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Orden
          </label>
          <input
            type="number"
            value={orden}
            onChange={(e) =>
              setOrden(e.target.value === "" ? "" : parseInt(e.target.value))
            }
            required
            min="1"
            className="w-full p-3 mt-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {/* Botones (sin cambios) */}
        <div className="flex justify-between items-center pt-4 border-t dark:border-gray-600 mt-6">
          <button
            type="button"
            onClick={() => navigate("/lineas")}
            className="py-2 px-4 text-gray-700 dark:text-gray-300 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
          >
            {" "}
            <FaArrowLeft className="mr-2" /> Volver{" "}
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="py-2 px-5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center transition-colors"
          >
            {" "}
            <FaSave className="mr-2" />{" "}
            {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}{" "}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default EditEstacionPage;
