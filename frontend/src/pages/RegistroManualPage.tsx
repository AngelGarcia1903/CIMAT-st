import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductionLines, registrarPasoManual } from "../services/api";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FaArrowRight,
  FaSync,
  FaInfoCircle,
  FaCheck,
  FaTimes,
  FaClipboardList,
} from "react-icons/fa";

// --- Tipos (Sin cambios) ---
interface ParametroValor {
  parametroId: number;
  valorReportado: string;
}

interface ParametroDef {
  id: number;
  nombreParametro: string;
  tipo: "numerico" | "texto" | "booleano";
  valorBooleanoOK?: boolean | null;
}

interface EstacionDef {
  id: number;
  nombreEstacion: string;
  orden: number;
  parametros: ParametroDef[];
}

interface LineaParaSimulador {
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
    [],
  );

  const { data: lineas, isLoading: isLoadingLineas } = useQuery<
    LineaParaSimulador[]
  >({
    queryKey: ["productionLines"],
    queryFn: getProductionLines,
  });

  const selectedLinea = lineas?.find((l) => l.id === parseInt(selectedLineaId));
  const estacionesOrdenadas = selectedLinea?.estaciones?.sort(
    (a, b) => a.orden - b.orden,
  );
  const currentStation = estacionesOrdenadas?.[currentStationIndex];

  const getDefaultValues = (parametros: ParametroDef[]) => {
    return parametros.map((p) => {
      let valorReportado: string;
      if (p.tipo === "numerico") {
        valorReportado = "0";
      } else if (p.tipo === "texto") {
        valorReportado = "OK";
      } else if (p.tipo === "booleano") {
        valorReportado = p.valorBooleanoOK === false ? "false" : "true";
      } else {
        valorReportado = "";
      }
      return { parametroId: p.id, valorReportado };
    });
  };

  useEffect(() => {
    if (currentStation?.parametros) {
      setParametrosValores(getDefaultValues(currentStation.parametros));
    } else {
      setParametrosValores([]);
    }
  }, [currentStation]);

  const registrarPasoMutation = useMutation({
    mutationFn: registrarPasoManual,
    onSuccess: () => {
      toast.success(`Paso registrado en: ${currentStation?.nombreEstacion}`);
      if (currentStation) {
        queryClient.invalidateQueries({
          queryKey: ["registrosLoteActivo", selectedLineaId],
        });
        queryClient.invalidateQueries({ queryKey: ["busquedaHistorial"] });
      }

      if (
        estacionesOrdenadas &&
        currentStationIndex < estacionesOrdenadas.length - 1
      ) {
        setCurrentStationIndex(currentStationIndex + 1);
      } else {
        toast.success(`Producto ${numeroSerie} completó la línea.`);
        resetSimulation(false);
      }
    },
    onError: (error: any) => {
      toast.error(
        `Error al registrar: ${error.response?.data?.message || error.message}`,
      );
    },
  });

  const handleParamChange = (paramId: number, value: string) => {
    setParametrosValores(
      parametrosValores.map((p) =>
        p.parametroId === paramId ? { ...p, valorReportado: value } : p,
      ),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStation || !numeroSerie.trim()) return;

    const paramsSinValor = parametrosValores.find(
      (pv) => pv.valorReportado === "",
    );
    if (paramsSinValor) {
      const paramDef = currentStation.parametros.find(
        (p) => p.id === paramsSinValor.parametroId,
      );
      toast.error(
        `Falta valor para ${paramDef?.nombreParametro || "un parámetro"}.`,
      );
      return;
    }

    registrarPasoMutation.mutate({
      numeroSerie: numeroSerie.trim(),
      estacionId: currentStation.id,
      registrosParametros: parametrosValores,
    });
  };

  const resetSimulation = (showToast = true) => {
    setNumeroSerie("");
    setCurrentStationIndex(0);
    if (estacionesOrdenadas?.[0]?.parametros) {
      setParametrosValores(getDefaultValues(estacionesOrdenadas[0].parametros));
    }
    if (showToast) {
      toast.success("Registro reiniciado.");
    }
  };

  // --- Renderizado Optimizado para Móvil (Refactorización 9) ---
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} // Animación más sutil
      animate={{ opacity: 1, y: 0 }}
      className="p-2 md:p-6 max-w-2xl mx-auto" // Menos padding en móvil, max-width ajustado
    >
      <div className="flex items-center justify-center mb-4 md:mb-6">
        <FaClipboardList className="text-blue-600 dark:text-blue-400 text-2xl md:text-3xl mr-2" />
        <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">
          Registro Manual
        </h1>
      </div>

      <div className="space-y-4 md:space-y-6 p-4 md:p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
        {/* Selección de Línea */}
        <div>
          <label className="block text-xs md:text-sm font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
            1. Línea de Producción
          </label>
          <select
            value={selectedLineaId}
            onChange={(e) => {
              setSelectedLineaId(e.target.value);
              setCurrentStationIndex(0);
              setNumeroSerie("");
              setParametrosValores([]);
            }}
            className="w-full p-2.5 md:p-3 text-sm md:text-base border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            disabled={isLoadingLineas}
          >
            <option value="">
              {isLoadingLineas ? "Cargando..." : "-- Seleccionar Línea --"}
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 md:space-y-6"
          >
            {/* Input Número de Serie */}
            <div>
              <label className="block text-xs md:text-sm font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                2. Número de Serie
              </label>
              <input
                type="text"
                maxLength={50}
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                placeholder="Ej: PROD-001"
                className="w-full p-2.5 md:p-3 text-sm md:text-base border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                required
              />
            </div>

            {/* Formulario Estación Actual */}
            {currentStation && numeroSerie ? (
              <form
                onSubmit={handleSubmit}
                className="p-4 md:p-6 border border-gray-200 dark:border-gray-600 rounded-xl bg-blue-50/50 dark:bg-gray-700/30"
              >
                {/* Encabezado Estación */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-600">
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Estación Actual
                    </span>
                    <h3 className="text-lg md:text-xl font-bold text-blue-700 dark:text-blue-300">
                      {currentStation.nombreEstacion}
                    </h3>
                  </div>
                  <span className="text-xs md:text-sm font-medium text-gray-500 bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm mt-1 md:mt-0 w-fit">
                    Paso {currentStationIndex + 1} de{" "}
                    {estacionesOrdenadas?.length}
                  </span>
                </div>

                {/* Inputs de Parámetros */}
                <div className="space-y-3 md:space-y-4">
                  {currentStation.parametros.length > 0 ? (
                    currentStation.parametros.map((paramDef) => {
                      const pv = parametrosValores.find(
                        (p) => p.parametroId === paramDef.id,
                      );
                      if (!pv) return null;

                      let okValue = "true";
                      let nokValue = "false";
                      let okLabel = "OK";
                      let nokLabel = "NO OK";

                      if (paramDef.tipo === "booleano") {
                        if (paramDef.valorBooleanoOK === false) {
                          okValue = "false";
                          nokValue = "true";
                        }
                      }

                      return (
                        <div
                          key={paramDef.id}
                          className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-600 shadow-sm"
                        >
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                            {paramDef.nombreParametro}
                          </label>

                          {/* CASO: Numérico */}
                          {paramDef.tipo === "numerico" && (
                            <input
                              type="number"
                              step="any"
                              value={pv.valorReportado}
                              onChange={(e) =>
                                handleParamChange(paramDef.id, e.target.value)
                              }
                              className="w-full p-2 text-sm md:text-base border rounded-md dark:bg-gray-700 dark:border-gray-500 focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          )}

                          {/* CASO: Booleano */}
                          {paramDef.tipo === "booleano" && (
                            <div className="flex gap-2">
                              {/* Botones tipo Radio para móvil es mejor que select */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleParamChange(paramDef.id, okValue)
                                }
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                                  pv.valorReportado === okValue
                                    ? "bg-green-600 text-white shadow-md"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                }`}
                              >
                                <FaCheck size={12} /> {okLabel}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleParamChange(paramDef.id, nokValue)
                                }
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                                  pv.valorReportado === nokValue
                                    ? "bg-red-600 text-white shadow-md"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                }`}
                              >
                                <FaTimes size={12} /> {nokLabel}
                              </button>
                            </div>
                          )}

                          {/* CASO: Texto */}
                          {paramDef.tipo === "texto" && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleParamChange(paramDef.id, "OK")
                                }
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                                  pv.valorReportado === "OK"
                                    ? "bg-green-600 text-white shadow-md"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                }`}
                              >
                                <FaCheck size={12} /> OK
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleParamChange(paramDef.id, "NO OK")
                                }
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                                  pv.valorReportado === "NO OK"
                                    ? "bg-red-600 text-white shadow-md"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                }`}
                              >
                                <FaTimes size={12} /> NO OK
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-sm text-gray-500 py-4">
                      Sin parámetros definidos.
                    </p>
                  )}
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-col-reverse md:flex-row gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={() => resetSimulation(true)}
                    className="w-full md:w-auto py-2.5 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                  >
                    <FaSync className="mr-2" /> Reiniciar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      registrarPasoMutation.isPending ||
                      currentStation.parametros.length === 0
                    }
                    className="w-full md:flex-1 py-2.5 px-6 text-sm md:text-base font-bold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registrarPasoMutation.isPending ? (
                      "Procesando..."
                    ) : (
                      <>
                        Registrar y Avanzar <FaArrowRight className="ml-2" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : numeroSerie && !currentStation ? (
              <div className="text-center p-6 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm">
                <FaCheck className="inline-block mr-2 mb-1" />
                Producto finalizado o línea sin configuración.
              </div>
            ) : !numeroSerie ? (
              <div className="text-center p-6 bg-gray-50 dark:bg-gray-700/30 text-gray-500 rounded-lg text-sm">
                <FaInfoCircle className="inline-block mr-2 mb-1" />
                Ingresa un N° de Serie para comenzar.
              </div>
            ) : null}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default RegistroManualPage;
