import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
// Importar la función de búsqueda y el tipo de filtros
import {
  buscarRegistrosHistorial,
  getProductionLines,
  getFechasDisponibles, // <-- Importar nueva función
  type FiltrosHistorial,
} from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaSearch,
  FaSpinner,
  FaFileAlt,
  FaTimes,
  FaHistory,
} from "react-icons/fa"; // Importar FaTimes y FaHistory
import toast from "react-hot-toast";
import HistorialFallasModal from "../components/common/HistorialFallasModal";

// --- Tipos de Datos (Completos) ---
interface RegistroHistorial {
  id: number;
  fecha: string;
  valorReportado: string | null;
  resultado: string;
  producto: {
    id: number;
    numeroSerie: string;
    estado: string;
    conteoReprocesos: number;
    // -------------------------
    lote: {
      nombre: string;
      linea: {
        nombre: string;
      };
    };
  };
  estacion: { nombreEstacion: string };
  parametro: { nombreParametro: string };
  año: number;
  mes: number;
  dia: number;
}
interface LineaSimple {
  id: number;
  nombre: string;
}
type FechasMap = Record<number, number[]>;

// Interfaces de Búsqueda de Trazabilidad (No usadas directamente por esta página, pero relacionadas)

// --- Fin Tipos ---
// ========================================================================
// Componente de Tarjeta Individual (para Móvil) - ¡NUEVO!
// ========================================================================
const RegistroCard: React.FC<{ registro: RegistroHistorial }> = ({
  registro,
}) => {
  const { producto, estacion, parametro, fecha, valorReportado, resultado } =
    registro;
  const { lote, numeroSerie, estado, conteoReprocesos } = producto;
  const isOK = resultado === "OK";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 p-4 space-y-3">
      {/* Encabezado: N° Serie y Resultado */}
      <div className="flex justify-between items-center pb-2 border-b dark:border-gray-600">
        <span
          className="font-mono font-bold text-base text-blue-600 dark:text-blue-400 truncate"
          title={numeroSerie}
        >
          {numeroSerie}
        </span>
        <span
          className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
            isOK
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
          }`}
        >
          {resultado}
        </span>

        {/* --- NUEVO: Razón de Falla (Móvil) --- */}
        {!isOK && (
          <p className="text-[10px] text-red-500 font-medium mt-1">
            Fallo: Fuera de rango
          </p>
        )}
        {/* ------------------------------------- */}
      </div>

      <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
        <div className="text-xs">
          <span className="text-gray-500 dark:text-gray-400 block">
            Estado:
          </span>
          <span
            className={`font-bold ${
              estado === "COMPLETADO"
                ? "text-green-600"
                : estado === "DESCARTADO"
                ? "text-red-600"
                : estado === "REPROCESO"
                ? "text-yellow-600"
                : "text-blue-600"
            }`}
          >
            {estado}
          </span>
        </div>
        <div className="text-xs text-right">
          <span className="text-gray-500 dark:text-gray-400 block">
            Reprocesos:
          </span>
          <span
            className={`font-bold ${
              estado === "DESCARTADO"
                ? "text-red-600"
                : "text-gray-800 dark:text-gray-200"
            }`}
          >
            {conteoReprocesos}
          </span>
        </div>
      </div>

      {/* Cuerpo: Info de Contexto */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-sm">
        <span className="text-gray-500 dark:text-gray-400">Línea:</span>
        <span className="col-span-2 font-medium text-gray-900 dark:text-gray-100 truncate">
          {lote.linea.nombre}
        </span>

        <span className="text-gray-500 dark:text-gray-400">Lote:</span>
        <span
          className="col-span-2 font-medium text-gray-900 dark:text-gray-100 truncate"
          title={lote.nombre}
        >
          {lote.nombre}
        </span>

        <span className="text-gray-500 dark:text-gray-400">Estación:</span>
        <span className="col-span-2 font-medium text-gray-900 dark:text-gray-100">
          {estacion.nombreEstacion}
        </span>
      </div>

      {/* Parámetro */}
      <div className="pt-2 border-t dark:border-gray-600">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {parametro.nombreParametro}
        </span>
        <p className="font-mono text-lg text-gray-900 dark:text-white">
          {valorReportado ?? "-"}
        </p>
      </div>

      {/* Pie: Fecha */}
      <div className="text-xs text-gray-400 dark:text-gray-500 pt-2 text-right">
        {new Date(fecha).toLocaleString()}
      </div>
    </div>
  );
};

// ========================================================================
// Componente de Tabla de Resultados (Refactorizado)
// ========================================================================
// ========================================================================
// Componente de Tabla de Resultados (CORREGIDO)
// ========================================================================
const ResultadosTabla: React.FC<{
  registros: RegistroHistorial[];
  onVerFallas: (id: number, serie: string) => void;
}> = ({ registros, onVerFallas }) => {
  return (
    <>
      {/* 1. VISTA DE TABLA (Escritorio) */}
      <div className="hidden md:block overflow-x-auto shadow-md rounded-lg mt-6 border dark:border-gray-700">
        <table className="min-w-full bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {/* 1. Fecha */}
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Fecha
              </th>
              {/* 2. Serie */}
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                N° Serie
              </th>
              {/* 3. Estación */}
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Estación
              </th>
              {/* 4. Parámetro (ANTES ESTABA MOVIDO) */}
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Parámetro
              </th>
              {/* 5. Valor */}
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Valor
              </th>
              {/* 6. Resultado (OK/NO_OK) */}
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Resultado
              </th>
              {/* 7. Reprocesos (NUEVO) */}
              <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Reprocesos
              </th>
              {/* 8. Estado Actual (NUEVO) */}
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Estado Actual
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {registros.map((reg) => (
              <tr
                key={reg.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                {/* 1. Fecha */}
                <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {new Date(reg.fecha).toLocaleString()}
                </td>
                {/* 2. Serie (Con Lote y Línea en tooltip) */}
                <td className="py-3 px-4 whitespace-nowrap font-mono text-sm font-medium text-gray-900 dark:text-white">
                  <div className="flex flex-col">
                    <span>{reg.producto.numeroSerie}</span>
                    <span className="text-[10px] text-gray-400">
                      {reg.producto.lote.nombre}
                    </span>
                  </div>
                </td>
                {/* 3. Estación */}
                <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
                  {reg.estacion.nombreEstacion}
                </td>
                {/* 4. Parámetro (AHORA SÍ COINCIDE) */}
                <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
                  {reg.parametro.nombreParametro}
                </td>
                {/* 5. Valor */}
                <td className="py-3 px-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                  {reg.valorReportado ?? "-"}
                </td>
                {/* 6. Resultado (Con razón de falla) */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <span
                    className={`font-semibold text-xs px-2 py-1 rounded-full ${
                      reg.resultado === "OK"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                    }`}
                  >
                    {reg.resultado}
                  </span>
                  {/* Mensaje de error si NO_OK */}
                  {reg.resultado === "NO_OK" && (
                    <div className="text-[10px] text-red-500 mt-1 font-medium max-w-[150px] whitespace-normal leading-tight">
                      ↳ Fuera de rango
                    </div>
                  )}
                </td>
                {/* 7. Reprocesos (LÓGICA REFINADA) */}
                <td className="py-3 px-4 whitespace-nowrap text-center text-sm">
                  {(() => {
                    const { estado, conteoReprocesos } = reg.producto;

                    // Lógica de visualización del Modal:
                    // Se muestra si hay una falla activa (REPROCESO), una falla fatal (DESCARTADO)
                    // o si hay historial de fallas previas (conteo > 0).
                    const tieneFallas =
                      estado === "REPROCESO" ||
                      estado === "DESCARTADO" ||
                      conteoReprocesos > 0;

                    return (
                      <span
                        onClick={() => {
                          if (tieneFallas) {
                            onVerFallas(
                              reg.producto.id,
                              reg.producto.numeroSerie
                            );
                          }
                        }}
                        className={`font-bold transition-colors duration-200 ${
                          estado === "DESCARTADO"
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-700 dark:text-gray-300"
                        } ${
                          tieneFallas
                            ? "cursor-pointer hover:text-blue-600 hover:underline decoration-blue-500 decoration-2 underline-offset-2"
                            : "cursor-default"
                        }`}
                        title={
                          tieneFallas ? "Ver historial de fallas" : "Sin fallas"
                        }
                      >
                        {conteoReprocesos}
                      </span>
                    );
                  })()}
                </td>
                {/* 8. Estado Actual (Badge) */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      reg.producto.estado === "COMPLETADO"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : reg.producto.estado === "DESCARTADO"
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                        : reg.producto.estado === "REPROCESO"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                    }`}
                  >
                    {reg.producto.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 2. VISTA DE TARJETAS (Móvil - Sin cambios mayores, solo asegurar datos) */}
      <div className="block md:hidden space-y-4 mt-6">
        {registros.map((reg) => (
          <RegistroCard key={reg.id} registro={reg} />
        ))}
      </div>
    </>
  );
};

// ========================================================================
// Componente Principal de la Página de Búsqueda
// ========================================================================
// Función auxiliar para obtener días en un mes
const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();
// Función auxiliar para formatear nombres de meses
const getMonthLabel = (monthNumber: number) => {
  const date = new Date(2000, monthNumber - 1, 1); // mes es 0-indexado
  let label = date.toLocaleString("es-MX", { month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const BusquedaAvanzadaPage: React.FC = () => {
  const [filtros, setFiltros] = useState<FiltrosHistorial>({});
  const [estado, setEstado] = useState<string>("todos");

  const [resultados, setResultados] = useState<RegistroHistorial[] | null>(
    null
  );

  // --- NUEVOS ESTADOS PARA EL MODAL ---
  const [fallasModalOpen, setFallasModalOpen] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<{
    id: number;
    serie: string;
  } | null>(null);

  // --- NUEVO MANEJADOR ---
  const handleVerFallas = (id: number, serie: string) => {
    setProductoSeleccionado({ id, serie });
    setFallasModalOpen(true);
  };

  // Query para poblar el desplegable de Líneas
  const { data: lineas, isLoading: isLoadingLineas } = useQuery<LineaSimple[]>({
    queryKey: ["lineasSimples"],
    queryFn: getProductionLines,
    select: (data) =>
      data.map((linea) => ({ id: linea.id, nombre: linea.nombre })),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Query para poblar filtros de fecha dinámicamente
  const { data: fechasDisponibles, isLoading: isLoadingFechas } =
    useQuery<FechasMap>({
      queryKey: ["fechasDisponibles"],
      queryFn: getFechasDisponibles,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 60, // 1 hora
    });

  // Mutación para ejecutar la búsqueda
  const busquedaMutation = useMutation({
    mutationFn: buscarRegistrosHistorial,
    onSuccess: (data) => {
      setResultados(data);
      toast.success(`${data.length} registro(s) encontrado(s).`);
    },
    onError: (error: any) => {
      setResultados(null); // Limpiar resultados anteriores
      toast.error(
        `Error: ${
          error.response?.data?.message || "No se encontraron registros."
        }`
      );
    },
  });

  // Manejador para actualizar el estado de los filtros
  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    let valorProcesado: string | number | undefined = value;
    if (
      name === "año" ||
      name === "mes" ||
      name === "dia" ||
      name === "lineaId"
    ) {
      valorProcesado = value ? parseInt(value) : undefined;
    } else {
      valorProcesado = value ? value.trim() : undefined;
    }

    // Lógica de reseteo dependiente
    setFiltros((prev) => {
      const nuevosFiltros = { ...prev, [name]: valorProcesado };
      if (name === "año") {
        nuevosFiltros.mes = undefined;
        nuevosFiltros.dia = undefined;
      }
      if (name === "mes") {
        nuevosFiltros.dia = undefined;
      }
      return nuevosFiltros;
    });
  };

  // Manejador para el envío del formulario
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Combina los filtros y el estado en un solo objeto
    const filtrosCompletos: FiltrosHistorial = {
      ...filtros,
      estado: estado === "todos" ? undefined : estado,
    };

    // Validar que al menos un filtro esté presente (ahora incluye 'estado')
    if (
      Object.values(filtrosCompletos).every((v) => v === undefined || v === "")
    ) {
      toast.error("Por favor, selecciona al menos un filtro.");
      return;
    }

    if ((filtros.mes || filtros.dia) && !filtros.año) {
      toast.error("Para buscar por mes o día, debes seleccionar un año.");
      return;
    }

    // Envía el objeto combinado
    busquedaMutation.mutate(filtrosCompletos);
  };

  // Botón para Limpiar la Búsqueda
  const handleClearSearch = () => {
    setFiltros({});
    setEstado("todos"); // <-- ¡AÑADE ESTA LÍNEA!
    setResultados(null);
    busquedaMutation.reset();
    const form = document.getElementById("historial-form") as HTMLFormElement;
    if (form) form.reset();
    toast("Filtros limpiados.", { icon: "🧹" });
  };

  // --- Opciones dinámicas para filtros de fecha ---
  const yearsDisponibles = useMemo(
    () =>
      fechasDisponibles
        ? Object.keys(fechasDisponibles)
            .map(Number)
            .sort((a, b) => b - a)
        : [],
    [fechasDisponibles]
  );

  const mesesDisponibles = useMemo(
    () =>
      filtros.año && fechasDisponibles
        ? (fechasDisponibles[filtros.año] || []).sort((a, b) => a - b)
        : [],
    [filtros.año, fechasDisponibles]
  );

  const diasDisponibles = useMemo(
    () =>
      filtros.año && filtros.mes
        ? Array.from(
            { length: getDaysInMonth(filtros.año, filtros.mes) },
            (_, i) => i + 1
          )
        : [],
    [filtros.año, filtros.mes]
  );
  // --- Fin Opciones ---

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center">
        <FaHistory className="mr-3 text-blue-500" /> Búsqueda de Historial
      </h1>

      {/* Panel de Filtros (Ya es responsivo) */}
      <form
        id="historial-form"
        onSubmit={handleSearch}
        className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700"
      >
        {/* El layout 'grid-cols-1' (móvil) ya está primero, por lo que apila bien */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Fila 1 */}
          <div>
            <label
              htmlFor="lineaId"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Línea
            </label>
            <select
              id="lineaId"
              name="lineaId"
              onChange={handleFilterChange}
              value={filtros.lineaId || ""}
              className="w-full p-2 mt-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {isLoadingLineas ? (
                <option>Cargando...</option>
              ) : (
                lineas?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label
              htmlFor="nombreLote"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Nombre Lote (parcial)
            </label>
            <input
              type="text"
              id="nombreLote"
              name="nombreLote"
              value={filtros.nombreLote || ""}
              onChange={handleFilterChange}
              placeholder="LINEA_A-..."
              className="w-full p-2 mt-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="numeroSerie"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              N° Serie (Prioritario)
            </label>
            <input
              type="text"
              id="numeroSerie"
              name="numeroSerie"
              value={filtros.numeroSerie || ""}
              onChange={handleFilterChange}
              placeholder="PROD-001"
              className="w-full p-2 mt-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          {/* Filtro por Estado */}
          <div className="flex-1 min-w-[150px]">
            <label
              htmlFor="estado"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Estado
            </label>
            <select
              id="estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todos">Todos los Estados</option>
              <option value="COMPLETADO">Completado</option>
              <option value="REPROCESO">Reproceso</option>
              <option value="DESCARTADO">Descartado</option>
              <option value="EN_PROCESO">En Proceso</option>
            </select>
          </div>

          {/* Fila 2 (Fechas) */}
          <div>
            <label
              htmlFor="año"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Año
            </label>
            <select
              id="año"
              name="año"
              onChange={handleFilterChange}
              value={filtros.año || ""}
              className="w-full p-2 mt-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {isLoadingFechas ? (
                <option>Cargando...</option>
              ) : (
                yearsDisponibles.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label
              htmlFor="mes"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Mes
            </label>
            <select
              id="mes"
              name="mes"
              onChange={handleFilterChange}
              value={filtros.mes || ""}
              className="w-full p-2 mt-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              disabled={!filtros.año}
            >
              <option value="">Todos</option>
              {mesesDisponibles.map((m) => (
                <option key={m} value={m}>
                  {getMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="dia"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Día
            </label>
            <select
              id="dia"
              name="dia"
              onChange={handleFilterChange}
              value={filtros.dia || ""}
              className="w-full p-2 mt-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              disabled={!filtros.mes}
            >
              <option value="">Todos</option>
              {diasDisponibles.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Botones */}
          <div className="flex items-end space-x-2">
            <button
              type="submit"
              disabled={busquedaMutation.isPending}
              className="w-full p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {busquedaMutation.isPending ? (
                <FaSpinner className="animate-spin mr-2" />
              ) : (
                <FaSearch className="mr-2" />
              )}
              Buscar
            </button>
            {(busquedaMutation.isSuccess ||
              busquedaMutation.isError ||
              Object.values(filtros).some(
                (v) => v !== undefined && v !== ""
              )) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="w-auto p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors flex items-center justify-center"
                title="Limpiar filtros"
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic">
          Nota: La búsqueda por N° Serie es prioritaria e ignora los demás
          filtros.
        </p>
      </form>

      {/* Área de Resultados */}
      <AnimatePresence>
        {busquedaMutation.isPending && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center p-10"
          >
            <FaSpinner className="animate-spin text-blue-500 text-4xl mx-auto" />
          </motion.div>
        )}
        {busquedaMutation.isError && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center p-10 mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg"
          >
            <FaFileAlt className="mx-auto text-4xl text-yellow-500 mb-3" />
            <h3 className="text-xl font-semibold text-yellow-800 dark:text-yellow-300">
              No se encontraron resultados
            </h3>
            <p className="text-yellow-700 dark:text-yellow-400 mt-2">
              {busquedaMutation.error.response?.data?.message ||
                busquedaMutation.error.message}
            </p>{" "}
            {/* <-- Este era el error Cannot find name 'F' */}
          </motion.div>
        )}
        {/* Mostrar tabla si hay resultados */}
        {resultados && resultados.length > 0 && !busquedaMutation.isPending && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Componente ResumenBusqueda eliminado */}
            <ResultadosTabla
              registros={resultados}
              onVerFallas={handleVerFallas}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- RENDERIZAR EL MODAL AL FINAL --- */}
      <HistorialFallasModal
        isOpen={fallasModalOpen}
        onClose={() => setFallasModalOpen(false)}
        productoId={productoSeleccionado?.id || null}
        numeroSerie={productoSeleccionado?.serie || ""}
      />
      {/* ---------------------------------- */}
    </motion.div>
  );
};

export default BusquedaAvanzadaPage;
