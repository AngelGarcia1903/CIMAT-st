import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProductionLineById,
  getActiveLoteRecordsByLinea, // <-- 2. getActiveLoteRecordsByLinea AÑADIDO
  getProductTraceability,
} from "../services/api";
import {
  FaSearch,
  FaArrowLeft,
  FaTimes,
  FaSpinner,
  //  3. Iconos innecesarios ELIMINADOS (FaEdit, FaChevronRight)
} from "react-icons/fa";
import { motion } from "framer-motion";
//  4. Lógica de inspección ELIMINADA (useAuth, Rol, ManualInspectionModal)

// --- Interfaces (Refactorizadas) ---
interface ParametroDef {
  id: number;
  nombreParametro: string;
  tipo: "numerico" | "texto" | "booleano";
  // 'opciones' y 'opcionCorrecta' ya no existen
}
interface EstacionDef {
  id: number;
  nombreEstacion: string;
  orden: number;
  parametros: ParametroDef[];
}
interface LineaConEstaciones {
  id: number;
  nombre: string;
  descripcion: string | null;
  estaciones: EstacionDef[];
}

//  5. NUEVAS Interfaces para la tabla única (coinciden con backend)
interface ParametroRegistro {
  parametroId: number;
  nombre: string;
  valor: string | null;
  resultado: string;
}
interface PasadaInfo {
  fecha: string;
  estacionId: number;
  nombreEstacion: string;
  orden: number;
  parametros: ParametroRegistro[];
}
interface ProductoEnLote {
  numeroSerie: string;
  idProducto: number;
  estado: string;
  conteoReprocesos: number;
  pasadas: PasadaInfo[]; // Array de pasadas (registros por estación)
}
// --- Fin Nuevas Interfaces ---

// Interfaz para la búsqueda (sin cambios)
// Removed unused interfaces HistorialPasada and HistorialEstacion
interface TraceabilityData {
  numeroSerie: string;
  lote: {
    nombre: string;
    linea: {
      nombre: string;
    };
  };
  estado: string;
  historialPorEstacion: {
    id: number;
    nombreEstacion: string;
    orden: number;
    pasadas: {
      fecha: string;
      parametros: {
        nombre: string;
        valor: string | null;
        resultado: string;
      }[];
    }[];
  }[];
}

// ========================================================================
// Componente StationTable
//  6. ELIMINADO por completo
// ========================================================================

// ========================================================================
// Componente SearchResults
// (Sin cambios, ya estaba correcto)
// ========================================================================
const SearchResults: React.FC<{
  data: TraceabilityData | null;
  isLoading: boolean;
  error: Error | null;
  onClear: () => void;
}> = ({ data, isLoading, error, onClear }) => {
  // ... (Toda la lógica de SearchResults permanece igual)
  if (isLoading) return <div className="p-4 text-center">Buscando...</div>;
  if (error)
    return (
      <div className="p-4 text-center text-orange-600 dark:text-orange-400">
        Error: {error.message || "No se encontró el producto."}
      </div>
    );
  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 mb-8 p-6 bg-blue-50 dark:bg-gray-700 rounded-lg shadow-lg border border-blue-200 dark:border-gray-600"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">
            Trazabilidad de:{" "}
            <span className="font-mono">{data.numeroSerie}</span>
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Lote:</strong> {data.lote.nombre} | <strong>Línea:</strong>{" "}
            {data.lote.linea.nombre} | <strong>Estado:</strong> {data.estado}
          </p>
        </div>
        <button
          onClick={onClear}
          className="text-gray-500 hover:text-red-600 p-1"
          title="Limpiar Búsqueda"
        >
          <FaTimes size={18} />
        </button>
      </div>
      <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-700 dark:text-gray-200">
        Historial por Estación:
      </h3>
      {data.historialPorEstacion && data.historialPorEstacion.length > 0 ? (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {data.historialPorEstacion.map((estacion) => (
            <div
              key={estacion.id}
              className="p-4 bg-white dark:bg-gray-600 rounded shadow-sm text-sm border dark:border-gray-500"
            >
              <h4 className="font-bold text-gray-800 dark:text-white mb-2">
                {estacion.nombreEstacion} (Orden: {estacion.orden})
              </h4>
              {estacion.pasadas.map((pasada, idx) => (
                <div
                  key={idx}
                  className={`text-sm ${
                    idx > 0
                      ? "mt-2 pt-2 border-t border-dashed dark:border-gray-500"
                      : ""
                  }`}
                >
                  <p className="font-semibold text-xs text-gray-500 dark:text-gray-400 mb-1">
                    REGISTRO {idx + 1} (
                    {new Date(pasada.fecha).toLocaleString()})
                  </p>
                  <ul className="list-disc list-inside pl-2">
                    {pasada.parametros.map((param, pIdx) => (
                      <li key={pIdx}>
                        <span className="text-gray-600 dark:text-gray-300">
                          {param.nombre}:{" "}
                        </span>
                        <span className="font-mono">{param.valor ?? "-"}</span>
                        <span
                          className={`ml-2 font-semibold text-xs ${
                            param.resultado === "OK"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          ({param.resultado})
                        </span>

                        {/* --- NUEVO: Razón de Falla --- */}
                        {param.resultado === "NO_OK" && (
                          <span className="block text-xs text-red-500 font-medium ml-4 mt-0.5">
                            ↳ Fallo: Valor fuera del rango o criterio
                            establecido.
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">
          No hay registros de pasos para este producto.
        </p>
      )}
    </motion.div>
  );
};

// ========================================================================
// Componente Principal MonitorProduccionPage (¡Refactorizado!)
// ========================================================================
const MonitorProduccionPage: React.FC = () => {
  const { lineaId } = useParams<{ lineaId: string }>();
  const queryClient = useQueryClient();
  //  7. Lógica de roles e inspección ELIMINADA
  // const { userRole } = useAuth();
  // const [activeStationId, setActiveStationId] = useState<number | null>(null);
  // const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  // ... (estados de modal eliminados) ...

  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Query para detalles de la línea (obtiene info general)
  const {
    data: linea,
    isLoading: isLoadingLinea,
    isError: isErrorLinea,
  } = useQuery<LineaConEstaciones>({
    queryKey: ["lineDetails", lineaId],
    queryFn: () => getProductionLineById(lineaId!),
    enabled: !!lineaId,
    refetchOnWindowFocus: false, // No recargar solo por cambiar de pestaña
  });

  //  8. NUEVA QUERY para la tabla única
  // Llama a la nueva función que trae todos los registros del lote activo
  const {
    data: productosEnLote,
    isLoading: isLoadingRegistros,
    isError: isErrorRegistros,
  } = useQuery<ProductoEnLote[]>({
    queryKey: ["activeLoteRecords", lineaId],
    queryFn: () => getActiveLoteRecordsByLinea(lineaId!),
    enabled: !!lineaId && !searchQuery, // Activar solo si hay lineaId y no estamos buscando
    refetchInterval: 5000, // Refrescar cada 5 segundos
  });

  // Query para búsqueda (sin cambios)
  const {
    data: searchResult,
    isLoading: isSearching,
    error: searchError,
  } = useQuery<TraceabilityData | null, Error>({
    queryKey: ["productTraceability", searchQuery, lineaId],
    queryFn: () => getProductTraceability(searchQuery, lineaId!),
    enabled: !!searchQuery && !!lineaId,
    retry: false,
    refetchOnWindowFocus: false,
    initialData: null,
  });

  // --- Manejadores (Simplificados) ---
  const handleSearch = () => {
    if (searchTerm.trim()) {
      setSearchQuery(searchTerm.trim());
    } else {
      clearSearch();
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchQuery("");
    queryClient.setQueryData(
      ["productTraceability", searchQuery, lineaId],
      null
    );
  };

  //  9. ELIMINADOS: handleInspectClick, closeInspectionModal, handleScrollToStation

  // Renderizado Condicional Temprano
  if (isLoadingLinea)
    return (
      <div className="p-8 text-center">
        <FaSpinner className="animate-spin text-blue-500 text-3xl mx-auto" />
      </div>
    );
  if (isErrorLinea || !linea)
    return (
      <div className="p-8 text-center text-red-500">Error al cargar línea.</div>
    );

  // --- Renderizado Principal ---
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-1"
    >
      {/* Cabecera (sin cambios) */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            Monitor:{" "}
            <span className="text-blue-600 dark:text-blue-400">
              {linea.nombre}
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {linea.descripcion || "Sin descripción"}
          </p>
        </div>
        <Link to="/home">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md flex items-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 w-full sm:w-auto justify-center"
          >
            <FaArrowLeft className="mr-2" /> Volver al Dashboard
          </motion.button>
        </Link>
      </div>

      {/* Barra de Búsqueda (sin cambios) */}
      <div className="mb-6 flex items-center space-x-2">
        <div className="relative flex-grow">
          <input
            type="text"
            maxLength={50}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar producto por Número de Serie..."
            className="w-full p-3 pl-10 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
          />
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <button
          onClick={handleSearch}
          className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Buscar
        </button>
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="p-3 bg-gray-300 dark:bg-gray-600 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            title="Limpiar Búsqueda"
          >
            <FaTimes />
          </button>
        )}
      </div>
      {/* Resultados de la Búsqueda (sin cambios) */}
      <SearchResults
        data={searchResult}
        isLoading={isSearching}
        error={searchError}
        onClear={clearSearch}
      />

      {/*  10. NUEVO LAYOUT: Tabla Única (Req #2) */}
      {!searchQuery && !searchError && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
            Registros del Lote Activo
          </h2>
          <div className="overflow-x-auto shadow-md rounded-lg border dark:border-gray-700">
            <table className="min-w-full bg-white dark:bg-gray-800">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    N° Serie
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estación
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reprocesos
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estado (Producto)
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Parámetros Registrados
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Fecha
                  </th>
                  {/* Columna "Acción" eliminada */}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {isLoadingRegistros ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center p-6 text-gray-500 dark:text-gray-400"
                    >
                      <FaSpinner className="animate-spin text-blue-500 text-2xl mx-auto" />
                    </td>
                  </tr>
                ) : isErrorRegistros ? (
                  <tr>
                    <td colSpan={5} className="text-center p-6 text-red-500">
                      Error al cargar registros del lote activo.
                    </td>
                  </tr>
                ) : !productosEnLote || productosEnLote.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center p-6 text-gray-500 dark:text-gray-400 italic"
                    >
                      Sin registros para el lote activo.
                    </td>
                  </tr>
                ) : (
                  // Iterar sobre los productos
                  productosEnLote.map((producto) =>
                    // Iterar sobre cada pasada (registro en estación)
                    producto.pasadas.map((pasada, _index) => (
                      <tr
                        key={`${producto.idProducto}-${pasada.estacionId}-${pasada.fecha}`}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-sm font-medium text-gray-900 dark:text-white">
                          {producto.numeroSerie}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
                          {pasada.nombreEstacion}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-center text-sm">
                          {/* Lógica Visual: Si está DESCARTADO, el número se pone ROJO y negrita */}
                          <span
                            className={`font-bold ${
                              producto.estado === "DESCARTADO"
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {producto.conteoReprocesos}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {/* Lógica Visual Actualizada V5 */}
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              producto.estado === "COMPLETADO"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : producto.estado === "DESCARTADO"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                : producto.estado === "REPROCESO"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" // EN_PROCESO ahora es AZUL
                            }`}
                          >
                            {producto.estado}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-300">
                          {pasada.parametros.map((p, i) => (
                            <div key={i} className="mb-1 last:mb-0">
                              <span className="font-semibold text-gray-700 dark:text-gray-100">
                                {p.nombre}:
                              </span>{" "}
                              {p.valor ?? "-"}
                              <span
                                className={`ml-1 font-bold text-xs ${
                                  p.resultado === "OK"
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                ({p.resultado})
                              </span>
                            </div>
                          ))}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(pasada.fecha).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
      {/* Fin Tabla Única */}

      {/*  11. Modal de Inspección ELIMINADO */}
    </motion.div>
  );
};

export default MonitorProduccionPage;
