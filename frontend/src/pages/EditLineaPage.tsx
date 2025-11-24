import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductionLineById, updateProductionLine } from "../services/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { FaSave, FaArrowLeft, FaSpinner } from "react-icons/fa"; // Añadir FaSpinner

// Interfaz para los datos de la línea
interface LineaData {
  id: number;
  nombre: string;
  descripcion?: string | null;
  opcuaUrl?: string | null;
  limiteReprocesos?: number; // <--- AGREGAR ESTO
}

const EditLineaPage: React.FC = () => {
  const { lineaId } = useParams<{ lineaId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [opcuaUrl, setOpcuaUrl] = useState("");
  const [limiteReprocesos, setLimiteReprocesos] = useState(3); // <--- AGREGAR ESTO

  // Query para obtener datos
  const {
    data: linea,
    isLoading,
    isError,
    error,
  } = useQuery<LineaData, Error>({
    // Especificar tipo Error
    queryKey: ["lineaDetails", lineaId],
    queryFn: () => getProductionLineById(lineaId!),
    enabled: !!lineaId,
    staleTime: 0,
    refetchOnWindowFocus: false, // Evitar refetch innecesario al cambiar ventana/pestaña
  });

  // Efecto para llenar el formulario DESPUÉS de cargar datos
  useEffect(() => {
    if (linea) {
      setNombre(linea.nombre);
      setDescripcion(linea.descripcion || "");
      setOpcuaUrl(linea.opcuaUrl || "");
      setLimiteReprocesos(linea.limiteReprocesos ?? 3); // <--- AGREGAR ESTO
    }
  }, [linea]); // Solo depende de 'linea'

  // Mutación para guardar
  const updateMutation = useMutation({
    mutationFn: (updatedData: {
      nombre: string;
      descripcion: string;
      opcuaUrl?: string;
      limiteReprocesos?: number; // <--- AGREGAR TIPO AQUÍ
    }) => updateProductionLine(lineaId!, updatedData),
    onSuccess: () => {
      toast.success("Línea actualizada.");
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
    if (!nombre.trim()) {
      toast.error("El nombre no puede estar vacío.");
      return;
    }
    updateMutation.mutate({ nombre, descripcion, opcuaUrl, limiteReprocesos }); // <--- AGREGAR ESTO
  };

  // --- Renderizado Condicional Mejorado ---
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <FaSpinner className="animate-spin text-blue-500 text-4xl" />
        <span className="ml-3 text-gray-500">
          Cargando datos de la línea...
        </span>
      </div>
    );
  }
  // Mostrar error si la query falló
  if (isError) {
    return (
      <div className="p-8 text-center text-red-500">
        Error al cargar la línea: {error?.message || "Error desconocido"}
      </div>
    );
  }
  // Mostrar mensaje si la línea no se encontró (ej: ID inválido en URL)
  if (!linea) {
    return (
      <div className="p-8 text-center text-orange-500">
        Línea no encontrada.
      </div>
    );
  }
  // --- Fin Renderizado Condicional ---

  // Si llegamos aquí, 'linea' existe y no hay error
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700"
    >
      <h1 className="text-3xl font-bold text-center text-blue-600 dark:text-blue-400 mb-6">
        Editar Línea: <span className="italic">{linea.nombre}</span>{" "}
        {/* Seguro acceder a linea.nombre */}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campos del formulario (sin cambios) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nombre
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full p-3 mt-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
            maxLength={50}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Descripción
          </label>
          <textarea
            value={descripcion}
            maxLength={255}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full p-3 mt-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="(Opcional)"
          />
        </div>

        {/* Campo URL OPC UA */}
        <div>
          <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
            URL del Servidor OPC UA (Opcional)
          </label>
          <input
            type="text"
            value={opcuaUrl}
            onChange={(e) => setOpcuaUrl(e.target.value)}
            placeholder="ej. opc.tcp://192.168.1.10:4840"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
            Límite de Reprocesos
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={limiteReprocesos}
            onChange={(e) => setLimiteReprocesos(parseInt(e.target.value) || 0)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            Número máximo de fallos antes de descartar (Tolerancia).
          </p>
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

export default EditLineaPage;
