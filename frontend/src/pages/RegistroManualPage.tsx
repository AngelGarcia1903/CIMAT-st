import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// CORRECCIÓN: Renombrado 'simulateProductionStep' a 'registrarPasoManual' para claridad
// Asumimos que 'registrarPasoManual' en api.ts llama al endpoint 'POST /api/produccion/registrar-paso'
import { getProductionLines, registrarPasoManual } from "../services/api";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FaArrowRight,
  FaSync,
  FaInfoCircle,
  FaCheck,
  FaTimes,
} from "react-icons/fa";

// --- Tipos ---
interface ParametroValor {
  parametroId: number;
  valorReportado: string;
}

interface ParametroDef {
  // Definición completa del parámetro
  id: number;
  nombreParametro: string;
  tipo: "numerico" | "texto" | "booleano";
  // --- V4.1: CAMBIO 1 ---
  valorBooleanoOK?: boolean | null; // Añadido el criterio de éxito
  // -----------------------
}

interface EstacionDef {
  // Definición completa de la estación
  id: number;
  nombreEstacion: string;
  orden: number;
  parametros: ParametroDef[];
}

interface LineaParaSimulador {
  // Definición completa de la línea
  id: number;
  nombre: string;
  estaciones: EstacionDef[];
}
// --- Fin Tipos ---

const RegistroManualPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [selectedLineaId, setSelectedLineaId] = useState<string>("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const [parametrosValores, setParametrosValores] = useState<ParametroValor[]>(
    []
  );

  // Query para obtener líneas (estructura completa necesaria)
  const { data: lineas, isLoading: isLoadingLineas } = useQuery<
    LineaParaSimulador[]
  >({
    queryKey: ["productionLines"], // Reutiliza caché (asegúrate que 'lineas' query en otros lados traiga 'valorBooleanoOK')
    queryFn: getProductionLines,
  });

  const selectedLinea = lineas?.find((l) => l.id === parseInt(selectedLineaId));
  const estacionesOrdenadas = selectedLinea?.estaciones?.sort(
    (a, b) => a.orden - b.orden
  );
  const currentStation = estacionesOrdenadas?.[currentStationIndex];

  // --- V4.1: CAMBIO 2 - Lógica de valor por defecto actualizada ---
  // Función auxiliar para obtener el valor por defecto
  const getDefaultValues = (parametros: ParametroDef[]) => {
    return parametros.map((p) => {
      let valorReportado: string;
      if (p.tipo === "numerico") {
        valorReportado = "0";
      } else if (p.tipo === "texto") {
        valorReportado = "OK";
      } else if (p.tipo === "booleano") {
        // El valor por defecto es el que se considera "OK"
        valorReportado = p.valorBooleanoOK === false ? "false" : "true";
      } else {
        valorReportado = "";
      }
      return { parametroId: p.id, valorReportado };
    });
  };

  // Efecto para inicializar/resetear valores de parámetros
  useEffect(() => {
    if (currentStation?.parametros) {
      setParametrosValores(getDefaultValues(currentStation.parametros));
    } else {
      setParametrosValores([]); // Limpiar si no hay estación
    }
  }, [currentStation]); // Se ejecuta solo cuando currentStation cambia
  // --- Fin V4.1 ---

  // Mutación para registrar el paso
  const registrarPasoMutation = useMutation({
    mutationFn: registrarPasoManual, // <-- Usando nombre de API actualizado
    onSuccess: () => {
      toast.success(`Paso registrado en: ${currentStation?.nombreEstacion}`);
      if (currentStation) {
        // Invalidar el monitor en vivo
        queryClient.invalidateQueries({
          queryKey: ["registrosLoteActivo", selectedLineaId],
        });
        // Invalidar el historial
        queryClient.invalidateQueries({ queryKey: ["busquedaHistorial"] });
      }

      // Avanzar a la siguiente estación o resetear
      if (
        estacionesOrdenadas &&
        currentStationIndex < estacionesOrdenadas.length - 1
      ) {
        setCurrentStationIndex(currentStationIndex + 1);
      } else {
        toast.success(`Producto ${numeroSerie} completó la línea.`);
        resetSimulation(false); // Resetear sin toast informativo
      }
    },
    onError: (error: any) => {
      toast.error(
        `Error al registrar paso: ${
          error.response?.data?.message || error.message
        }`
      );
    },
  });

  // --- Manejadores ---
  const handleParamChange = (paramId: number, value: string) => {
    setParametrosValores(
      parametrosValores.map((p) =>
        p.parametroId === paramId ? { ...p, valorReportado: value } : p
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStation || !numeroSerie.trim()) return;

    // Validación para asegurar que todos los parámetros tengan valor
    const paramsSinValor = parametrosValores.find(
      (pv) => pv.valorReportado === ""
    );
    if (paramsSinValor) {
      const paramDef = currentStation.parametros.find(
        (p) => p.id === paramsSinValor.parametroId
      );
      toast.error(
        `Por favor, selecciona un valor para ${
          paramDef?.nombreParametro || "un parámetro"
        }.`
      );
      return;
    }

    registrarPasoMutation.mutate({
      numeroSerie: numeroSerie.trim(),
      estacionId: currentStation.id,
      registrosParametros: parametrosValores,
    });
  };

  // Resetear para un nuevo producto
  const resetSimulation = (showToast = true) => {
    setNumeroSerie("");
    setCurrentStationIndex(0);
    // --- V4.1: CAMBIO 3 - Usar lógica de valor por defecto actualizada ---
    if (estacionesOrdenadas?.[0]?.parametros) {
      setParametrosValores(getDefaultValues(estacionesOrdenadas[0].parametros));
    }
    // --- Fin V4.1 ---
    if (showToast) {
      toast(() => (
        <div className="flex items-center">
          <FaInfoCircle className="text-blue-500 mr-3" size={20} />
          <span>Registro reiniciado para un nuevo producto.</span>
        </div>
      ));
    }
  };

  // --- Renderizado ---
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-1 max-w-3xl mx-auto"
    >
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">
        Registro Manual de Producción
      </h1>

      <div className="space-y-6 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700">
        {/* Selección de Línea */}
        <div>
          <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
            1. Selecciona Línea
          </label>
          <select
            value={selectedLineaId}
            onChange={(e) => {
              setSelectedLineaId(e.target.value);
              setCurrentStationIndex(0);
              setNumeroSerie("");
              setParametrosValores([]);
            }}
            className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
            disabled={isLoadingLineas}
          >
            <option value="">
              {isLoadingLineas ? "Cargando líneas..." : "-- Selecciona --"}
            </option>
            {lineas?.map((linea) => (
              <option key={linea.id} value={linea.id}>
                {linea.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Contenido si hay línea seleccionada */}
        {selectedLinea && (
          <>
            {/* Input Número de Serie */}
            <div>
              <label className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                2. Número de Serie del Producto
              </label>
              <input
                type="text"
                maxLength={50}
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                placeholder="Ej: PROD-AAA-001 (o N° Serie de retrabajo)"
                className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 font-mono focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Formulario Estación Actual */}
            {currentStation && numeroSerie ? (
              <form
                onSubmit={handleSubmit}
                className="p-6 border-2 border-dashed rounded-lg dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50"
              >
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                  Estación:{" "}
                  <span className="text-blue-600 dark:text-blue-400">
                    {currentStation.nombreEstacion}
                  </span>{" "}
                  (Paso {currentStationIndex + 1}/{estacionesOrdenadas?.length})
                </h3>
                {/* Inputs de Parámetros */}
                <div className="space-y-4">
                  {currentStation.parametros.length > 0 ? (
                    parametrosValores.map((pv) => {
                      const paramDef = currentStation.parametros.find(
                        (p) => p.id === pv.parametroId
                      );
                      if (!paramDef) return null;

                      // --- V4.1: CAMBIO 4 - Lógica de renderizado booleano ---
                      let okValue = "true";
                      let nokValue = "false";
                      let okLabel = "OK (true)";
                      let nokLabel = "NO OK (false)";

                      if (paramDef.tipo === "booleano") {
                        // Leemos la regla de la BD
                        // Si valorBooleanoOK es 'false', invertimos los valores
                        if (paramDef.valorBooleanoOK === false) {
                          okValue = "false";
                          nokValue = "true";
                          okLabel = "OK (false)";
                          nokLabel = "NO OK (true)";
                        }
                      }
                      // --- Fin V4.1 ---

                      // --- RENDERIZADO CONDICIONAL DE INPUTS ---
                      return (
                        <div key={paramDef.id}>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                            {paramDef.nombreParametro}
                          </label>

                          {/* CASO: Numérico */}
                          {paramDef.tipo === "numerico" && (
                            <input
                              type="number"
                              maxLength={25}
                              step="any"
                              value={pv.valorReportado}
                              onChange={(e) =>
                                handleParamChange(paramDef.id, e.target.value)
                              }
                              placeholder="Valor numérico"
                              className="w-full p-2 mt-1 border rounded-md dark:bg-gray-600 dark:border-gray-500 focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          )}

                          {/* CASO: Booleano */}
                          {paramDef.tipo === "booleano" && (
                            <select
                              value={pv.valorReportado}
                              onChange={(e) =>
                                handleParamChange(paramDef.id, e.target.value)
                              }
                              className="w-full p-2 mt-1 border rounded-md dark:bg-gray-600 dark:border-gray-500 focus:ring-2 focus:ring-blue-500"
                            >
                              {/* --- V4.1: Opciones dinámicas --- */}
                              <option value={okValue}>{okLabel}</option>
                              <option value={nokValue}>{nokLabel}</option>
                              {/* --- Fin V4.1 --- */}
                            </select>
                          )}

                          {/* CASO: Texto (Botones OK/NO OK) */}
                          {paramDef.tipo === "texto" && (
                            <div className="flex space-x-2 mt-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleParamChange(paramDef.id, "OK")
                                }
                                className={`py-2 px-4 rounded-md w-full flex items-center justify-center font-semibold transition-colors ${
                                  pv.valorReportado === "OK"
                                    ? "bg-green-600 text-white ring-2 ring-green-400"
                                    : "bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 hover:bg-gray-300"
                                }`}
                              >
                                <FaCheck className="mr-2" /> OK
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleParamChange(paramDef.id, "NO OK")
                                }
                                className={`py-2 px-4 rounded-md w-full flex items-center justify-center font-semibold transition-colors ${
                                  pv.valorReportado === "NO OK"
                                    ? "bg-red-600 text-white ring-2 ring-red-400"
                                    : "bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 hover:bg-gray-300"
                                }`}
                              >
                                <FaTimes className="mr-2" /> NO OK
                              </button>
                            </div>
                          )}
                          {/* --- Fin Renderizado Condicional --- */}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                      Esta estación no tiene parámetros definidos.
                    </p>
                  )}
                </div>
                {/* Botones de Acción del Formulario */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t dark:border-gray-600">
                  <button
                    type="button"
                    onClick={() => resetSimulation(true)}
                    title="Reiniciar para nuevo producto"
                    className="py-2 px-4 text-sm bg-gray-300 dark:bg-gray-600 rounded-md flex items-center hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  >
                    <FaSync className="mr-2" /> Reset
                  </button>
                  <button
                    type="submit"
                    disabled={
                      registrarPasoMutation.isPending ||
                      currentStation.parametros.length === 0
                    }
                    className="py-2 px-5 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registrarPasoMutation.isPending
                      ? "Registrando..."
                      : "Registrar y Avanzar"}
                    <FaArrowRight className="ml-2" />
                  </button>
                </div>
              </form>
            ) : // Mensajes si no hay estación o N° Serie
            numeroSerie && !currentStation ? (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-4">
                La línea seleccionada no tiene estaciones configuradas o el
                producto ha finalizado.
              </div>
            ) : !numeroSerie && selectedLinea.estaciones.length > 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-4">
                Ingresa un número de serie para comenzar el registro manual.
              </div>
            ) : null}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default RegistroManualPage;
