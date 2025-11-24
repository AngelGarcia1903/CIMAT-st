import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProductionLineById,
  createStation,
  createStationWithParameter,
  createParameterForStation,
} from "../services/api";
import toast from "react-hot-toast";
import { FaPlus, FaTrashAlt, FaSave, FaInfoCircle } from "react-icons/fa";
import { motion } from "framer-motion";
import Modal from "../components/common/Modal";

// --- Interfaces (Refactorizadas) ---
interface Parametro {
  id: number; // ID temporal
  nombreParametro: string;
  direccionOpcUa: string;
  tipo: "numerico" | "texto" | "booleano";
  valorMin?: number | null;
  valorMax?: number | null;
  valorBooleanoOK?: boolean | null; // V4.1 que ya implementamos
}
interface LineaConEstaciones {
  id: number;
  nombre: string;
  descripcion: string | null;
  estaciones: { id: number; orden: number }[];
}
// --- Fin Interfaces ---

const CrearEstacionPage: React.FC = () => {
  const { lineaId } = useParams<{ lineaId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- Estados ---
  const [nombreEstacion, setNombreEstacion] = useState("");
  const [orden, setOrden] = useState(1);
  // --- V4: CAMBIO 1 - Añadir estado para los nuevos campos ---
  const [triggerNodeId, setTriggerNodeId] = useState("");
  const [serieNodeId, setSerieNodeId] = useState("");
  // --- Fin V4 ---
  const [parametros, setParametros] = useState<Parametro[]>([
    {
      id: Date.now(),
      nombreParametro: "",
      direccionOpcUa: "",
      tipo: "numerico",
      valorBooleanoOK: null,
    },
  ]);
  const [createdStationId, setCreatedStationId] = useState<number | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // --- Queries y Mutaciones ---
  const { data: linea, isLoading: isLoadingLinea } =
    useQuery<LineaConEstaciones>({
      queryKey: ["lineDetails", lineaId],
      queryFn: () => getProductionLineById(lineaId!),
      enabled: !!lineaId,
    });

  useEffect(() => {
    if (linea && !createdStationId) {
      setOrden(linea.estaciones.length + 1);
    }
  }, [linea, createdStationId]);

  const createStationMutation = useMutation({
    mutationFn: createStation,
    onSuccess: (data) => {
      toast.success(
        `Estación '${data.nombreEstacion}' y sus parámetros guardados.`
      );
      queryClient.invalidateQueries({ queryKey: ["lineas"] });
      queryClient.invalidateQueries({ queryKey: ["lineDetails", lineaId] });
      setNombreEstacion("");
      // --- V4: CAMBIO 2 - Resetear nuevos campos ---
      setTriggerNodeId("");
      setSerieNodeId("");
      // --- Fin V4 ---
      setOrden((prev) => prev + 1);
      setParametros([
        {
          id: Date.now(),
          nombreParametro: "",
          direccionOpcUa: "",
          tipo: "numerico",
          valorBooleanoOK: null,
        },
      ]);
      setCreatedStationId(null);
    },
    onError: (error: any) => {
      toast.error(
        `Error al crear la estación: ${
          error.response?.data?.message || error.message
        }`
      );
    },
  });

  const createStationWithParamMutation = useMutation({
    mutationFn: createStationWithParameter,
    onSuccess: (newStation) => {
      toast.success(
        `Estación '${newStation.nombreEstacion}' creada con su primer parámetro.`
      );
      setCreatedStationId(newStation.id);
      queryClient.invalidateQueries({ queryKey: ["lineas"] });
      queryClient.invalidateQueries({ queryKey: ["lineDetails", lineaId] });
    },
    onError: (error: any) =>
      toast.error(`Error: ${error.response?.data?.message || error.message}`),
  });

  const createParamForStationMutation = useMutation({
    mutationFn: createParameterForStation,
    onSuccess: (newParam) => {
      toast.success(`Parámetro '${newParam.nombreParametro}' guardado.`);
      queryClient.invalidateQueries({ queryKey: ["lineas"] });
    },
    onError: (error: any) =>
      toast.error(`Error: ${error.response?.data?.message || error.message}`),
  });

  // --- MANEJADORES ---
  const handleAddParametro = () => {
    setParametros([
      ...parametros,
      {
        id: Date.now(),
        nombreParametro: "",
        direccionOpcUa: "",
        tipo: "numerico",
        valorBooleanoOK: null,
      },
    ]);
  };

  const handleRemoveParametro = (paramId: number) => {
    if (parametros.length > 1 || (createdStationId && parametros.length > 0)) {
      setParametros(parametros.filter((p) => p.id !== paramId));
    } else {
      toast.error("Debe haber al menos un parámetro para crear la estación.");
    }
  };

  const handleParametroChange = (
    paramId: number,
    field: keyof Parametro,
    value: any
  ) => {
    setParametros(
      parametros.map((p) => {
        if (p.id === paramId) {
          const updatedParam = { ...p, [field]: value };
          if (field === "tipo") {
            updatedParam.valorMin = null;
            updatedParam.valorMax = null;
            updatedParam.valorBooleanoOK = null;
          }
          return updatedParam;
        }
        return p;
      })
    );
  };

  // --- LÓGICA DE GUARDADO ---
  const handleSaveIndividualParam = async (paramToSave: Parametro) => {
    const { id, ...parametroData } = paramToSave;

    if (
      !parametroData.nombreParametro?.trim() ||
      !parametroData.direccionOpcUa?.trim()
    ) {
      toast.error("Nombre y Dirección OPC son obligatorios.");
      return;
    }

    if (parametroData.tipo !== "numerico") {
      parametroData.valorMin = null;
      parametroData.valorMax = null;
    }
    if (parametroData.tipo !== "booleano") {
      parametroData.valorBooleanoOK = null;
    }

    try {
      if (!createdStationId) {
        if (!nombreEstacion.trim()) {
          toast.error("Asigna un nombre a la estación.");
          return;
        }
        // --- V4: CAMBIO 3 - Enviar nuevos campos ---
        // (Validación de trigger/serie opcional aquí, pero la BD lo permite null)
        await createStationWithParamMutation.mutateAsync({
          lineaId: linea?.id,
          nombreEstacion,
          orden,
          triggerNodeId: triggerNodeId.trim() || null, // Enviar null si está vacío
          serieNodeId: serieNodeId.trim() || null, // Enviar null si está vacío
          parametro: parametroData,
        });
        // --- Fin V4 ---
      } else {
        await createParamForStationMutation.mutateAsync({
          estacionId: createdStationId,
          parametroData,
        });
      }
      setParametros(parametros.filter((p) => p.id !== paramToSave.id));
    } catch (error) {
      console.error("Error en guardado individual:", error);
    }
  };

  const handleSubmitAll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineaId) return;

    const firstInvalidParam = parametros.find((p) => {
      if (!p.nombreParametro?.trim() || !p.direccionOpcUa?.trim()) {
        return true;
      }
      if (p.tipo === "numerico") {
        const minVal = p.valorMin != null ? Number(p.valorMin) : null;
        const maxVal = p.valorMax != null ? Number(p.valorMax) : null;
        if (minVal !== null && maxVal !== null && minVal > maxVal) {
          return true;
        }
      }
      return false;
    });

    if (firstInvalidParam) {
      let errorMsg = `Parámetro '${
        firstInvalidParam.nombreParametro || "(Sin nombre)"
      }' incompleto.`;
      if (
        firstInvalidParam.tipo === "numerico" &&
        Number(firstInvalidParam.valorMin) > Number(firstInvalidParam.valorMax)
      ) {
        errorMsg = `Error en '${firstInvalidParam.nombreParametro}': Mínimo no puede ser mayor que máximo.`;
      }
      toast.error(errorMsg);
      return;
    }

    const parametrosParaEnviar = parametros.map(({ id, ...p }) => {
      if (p.tipo !== "numerico") {
        p.valorMin = null;
        p.valorMax = null;
      }
      if (p.tipo !== "booleano") {
        p.valorBooleanoOK = null;
      }
      return p;
    });

    if (!createdStationId && parametros.length > 0) {
      createStationMutation.mutate({
        lineaId: String(lineaId),
        nombreEstacion,
        orden,
        // --- V4: CAMBIO 4 - Enviar nuevos campos ---
        triggerNodeId: triggerNodeId.trim() || null,
        serieNodeId: serieNodeId.trim() || null,
        // --- Fin V4 ---
        parametros: parametrosParaEnviar,
      });
    } else {
      const message =
        parametros.length > 0
          ? "Usa 'Guardar' (verde) para params restantes o 'Finalizar'."
          : "Formulario listo para siguiente estación.";

      toast(() => (
        <div className="flex items-center">
          <FaInfoCircle className="text-blue-500 mr-3" size={20} />
          <span>{message}</span>
        </div>
      ));

      if (parametros.length === 0 && createdStationId) {
        setNombreEstacion("");
        // --- V4: CAMBIO 5 - Resetear nuevos campos ---
        setTriggerNodeId("");
        setSerieNodeId("");
        // --- Fin V4 ---
        setOrden((prev) => prev + 1);
        setParametros([
          {
            id: Date.now(),
            nombreParametro: "",
            direccionOpcUa: "",
            tipo: "numerico",
            valorBooleanoOK: null,
          },
        ]);
        setCreatedStationId(null);
      }
    }
  };

  const confirmCancel = () => navigate(`/lineas`);

  // --- RENDERIZADO (JSX) ---
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700"
    >
      <h2 className="text-3xl font-bold text-center text-blue-600 dark:text-blue-400 mb-2">
        {createdStationId
          ? `Añadiendo Parámetros a '${nombreEstacion}'`
          : `Crear Nueva Estación`}
      </h2>
      <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
        Para la línea:{" "}
        <strong>{isLoadingLinea ? "Cargando..." : linea?.nombre}</strong>
      </p>

      <form onSubmit={handleSubmitAll} className="space-y-6">
        {/* Nombre Estación */}
        <div className="p-6 border rounded-lg dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Columna 1: Nombre y Orden */}
            <div>
              <h4 className="font-bold mb-4 text-gray-800 dark:text-gray-100">
                Estación #{orden}
              </h4>
              <input
                type="text"
                maxLength={50}
                value={nombreEstacion}
                onChange={(e) => setNombreEstacion(e.target.value)}
                placeholder="Nombre de la Estación *"
                required
                disabled={!!createdStationId}
                className="w-full p-3 border rounded-lg dark:bg-gray-600 dark:border-gray-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 dark:disabled:bg-gray-500/50 disabled:cursor-not-allowed"
              />
            </div>
            {/* Columna 2: Vacía o para Orden (aquí lo puse simple) */}
            <div>
              {/* (Puedes añadir el input de 'orden' aquí si quisieras moverlo) */}
            </div>
          </div>

          {/* --- V4: CAMBIO 6 - Añadir nuevos inputs para el mapeo V4 --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t dark:border-gray-600">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dirección OPC UA del Disparador (Trigger)
              </label>
              <input
                type="text"
                maxLength={100}
                value={triggerNodeId}
                onChange={(e) => setTriggerNodeId(e.target.value)}
                placeholder="Ej: ns=4;s=PLC.Estacion1.Ciclo_OK"
                disabled={!!createdStationId}
                className="w-full p-3 border rounded-lg dark:bg-gray-600 dark:border-gray-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 dark:disabled:bg-gray-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dirección OPC UA del N° Serie
              </label>
              <input
                type="text"
                maxLength={100}
                value={serieNodeId}
                onChange={(e) => setSerieNodeId(e.target.value)}
                placeholder="Ej: ns=4;s=PLC.Estacion1.Numero_Serie"
                disabled={!!createdStationId}
                className="w-full p-3 border rounded-lg dark:bg-gray-600 dark:border-gray-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 dark:disabled:bg-gray-500/50"
              />
            </div>
          </div>
          {/* --- Fin V4 --- */}
        </div>

        {/* Sección Parámetros */}
        <div className="space-y-4">
          <h5 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Parámetros a Registrar
          </h5>
          {/* Mapeo de Parámetros */}
          {parametros.map((param) => {
            return (
              <motion.div
                key={param.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-4 border rounded-md dark:border-gray-600 bg-white dark:bg-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4 items-start shadow-sm"
              >
                {/* Columna 1: Nombre y Dirección OPC */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Nombre y Dirección OPC (Parámetro)
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={param.nombreParametro}
                    onChange={(e) =>
                      handleParametroChange(
                        param.id,
                        "nombreParametro",
                        e.target.value
                      )
                    }
                    placeholder="Nombre Parámetro *"
                    required
                    className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 focus:ring-2 focus:ring-blue-500 "
                  />
                  <input
                    type="text"
                    maxLength={100}
                    value={param.direccionOpcUa}
                    onChange={(e) =>
                      handleParametroChange(
                        param.id,
                        "direccionOpcUa",
                        e.target.value
                      )
                    }
                    placeholder="Dirección OPC UA *"
                    required
                    className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Columna 2: Tipo y Configuración */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Tipo y Configuración
                  </label>
                  <select
                    value={param.tipo}
                    onChange={(e) =>
                      handleParametroChange(
                        param.id,
                        "tipo",
                        e.target.value as Parametro["tipo"]
                      )
                    }
                    className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="numerico">Numérico</option>
                    <option value="texto">Texto</option>
                    <option value="booleano">Booleano</option>
                  </select>

                  {param.tipo === "numerico" && (
                    <div className="flex flex-col md:flex-row md:space-x-2">
                      <input
                        maxLength={25}
                        type="number"
                        step="any"
                        value={param.valorMin ?? ""}
                        onChange={(e) =>
                          handleParametroChange(
                            param.id,
                            "valorMin",
                            e.target.value
                          )
                        }
                        placeholder="Mín (Opcional)"
                        className="w-full md:w-1/2 p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
                      />
                      <input
                        maxLength={25}
                        type="number"
                        step="any"
                        value={param.valorMax ?? ""}
                        onChange={(e) =>
                          handleParametroChange(
                            param.id,
                            "valorMax",
                            e.target.value
                          )
                        }
                        placeholder="Máx (Opcional)"
                        className="w-full md:w-1/2 p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500"
                      />
                    </div>
                  )}

                  {param.tipo === "booleano" && (
                    <div className="flex flex-col space-y-1 pt-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Criterio de Éxito (OK)
                      </label>
                      <select
                        value={
                          param.valorBooleanoOK === null
                            ? ""
                            : param.valorBooleanoOK
                            ? "true"
                            : "false"
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          const boolVal =
                            val === "true"
                              ? true
                              : val === "false"
                              ? false
                              : null;
                          handleParametroChange(
                            param.id,
                            "valorBooleanoOK",
                            boolVal
                          );
                        }}
                        className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">(Asumir 'true' es OK)</option>
                        <option value="true">El valor DEBE ser 'true'</option>
                        <option value="false">El valor DEBE ser 'false'</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Columna 3: Acciones */}
                <div className="flex items-center justify-end space-x-2 md:pt-6">
                  <motion.button
                    type="button"
                    onClick={() => handleSaveIndividualParam(param)}
                    className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    title="Guardar Parámetro"
                    disabled={
                      createStationWithParamMutation.isPending ||
                      createParamForStationMutation.isPending
                    }
                  >
                    <FaSave />
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => handleRemoveParametro(param.id)}
                    className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    title="Eliminar Parámetro"
                  >
                    <FaTrashAlt />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
          {/* Botón Añadir Parámetro */}
          <button
            type="button"
            onClick={handleAddParametro}
            className="flex items-center text-blue-600 dark:text-blue-400 hover:underline mt-2"
          >
            <FaPlus className="mr-2" /> Agregar Parámetro
          </button>
        </div>

        {/* Botones Finales (Sin cambios) */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-8 pt-4 border-t dark:border-gray-600 space-y-3 sm:space-y-0">
          {/* <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="py-2 px-4 text-gray-700 dark:text-gray-300 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 w-full sm:w-auto"
          >
            Cancelar
          </button> */}
          <div className="flex space-x-4 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="py-2 px-4 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex-1 sm:flex-none"
            >
              Finalizar
            </button>
            <button
              type="submit"
              className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex-1 sm:flex-none"
              disabled={createStationMutation.isPending}
            >
              {createdStationId ? "Siguiente Estación" : "Guardar Todo"}
            </button>
          </div>
        </div>
      </form>
      {/* Modal Cancelar (Sin cambios) */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancel}
        title="Confirmar Finalización"
        body="¿Seguro? Se perderá el progreso no guardado."
        confirmText="Sí, Salir"
      />
    </motion.div>
  );
};

export default CrearEstacionPage;
