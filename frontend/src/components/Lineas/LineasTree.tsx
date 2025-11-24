import React, { useState } from "react";
// 1. Mutaciones y QueryClient eliminados
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  getProductionLines,
  // 2. Funciones de mutación eliminadas
} from "../../services/api"; // Asumo que la ruta es correcta
// 3. Modales eliminados
import {
  FaPlus,
  FaTrashAlt,
  FaEdit,
  FaChevronRight,
  FaSitemap,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

// --- Interfaces (tipos de datos que maneja el árbol) ---
interface Parametro {
  id: number;
  nombreParametro: string;
  direccionOpcUa: string;
  tipo: "numerico" | "texto" | "booleano";
  valorMin?: number | null | string;
  valorMax?: number | null | string;
  // --- V4.1: AÑADIDO ---
  valorBooleanoOK?: boolean | null;
}

interface Estacion {
  id: number;
  nombreEstacion: string;
  orden: number;
  parametros: Parametro[];
  // --- V4: AÑADIDO ---
  triggerNodeId?: string | null;
  serieNodeId?: string | null;
}
// --- Fin V4 ---

interface Linea {
  id: number;
  nombre: string;
  descripcion?: string | null;
  opcuaUrl?: string | null;
  limiteReprocesos?: number; // <--- AGREGAR ESTO
  estaciones: Estacion[];
  lotes?: { id: number; nombre: string; estado: string }[];
}
// --- Fin Interfaces ---

// Tipo auxiliar para los callbacks
type ResourceType = "linea" | "estacion" | "parametro";

// 4. Interfaz de Props del Componente (ACTUALIZADA)
interface LineasTreeProps {
  isCollapsed: boolean;
  contexto: "sidebar" | "pagina";
  onClose?: () => void; // Para cerrar el menú móvil
  // Nuevas props de callback para notificar al MainLayout
  onDeleteItem: (item: {
    id: number;
    type: ResourceType;
    name: string;
  }) => void;
  onEditItem: (item: { id: number; type: ResourceType; data: any }) => void;
  onAddParam: (station: Estacion) => void;
}

const LineasTree: React.FC<LineasTreeProps> = ({
  isCollapsed,
  contexto,
  onClose,
  // 5. Recibir las nuevas props
  onDeleteItem,
  onEditItem,
  onAddParam,
}) => {
  const navigate = useNavigate();

  // --- Estados Locales (SIMPLIFICADOS) ---
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);

  // --- Query (Sin cambios) ---
  const {
    data: lineas,
    isLoading,
    isError,
    error,
  } = useQuery<Linea[], Error>({
    queryKey: ["lineas"],
    queryFn: getProductionLines,
    refetchOnWindowFocus: contexto === "pagina",
  });

  // --- Mutaciones ---
  // ... Todas las 'useMutation' (delete, update, create) han sido eliminadas ...

  // --- Manejadores de Eventos (Refactorizados) ---
  const toggleNode = (uniqueId: string) => {
    setExpandedNodes((prev) =>
      prev.includes(uniqueId)
        ? prev.filter((nodeId) => nodeId !== uniqueId)
        : [...prev, uniqueId]
    );
  };

  // 6. REFACTORIZADO: Ahora solo notifica al padre
  const handleDeleteClick = (
    item: Linea | Estacion | Parametro,
    type: ResourceType
  ) => {
    let name = "";
    if (type === "linea") name = (item as Linea).nombre;
    else if (type === "estacion") name = (item as Estacion).nombreEstacion;
    else name = (item as Parametro).nombreParametro;

    onDeleteItem({ id: item.id, type, name });
  };

  // 7. REFACTORIZADO V4/V4.1: Ahora notifica al padre o navega
  const handleEditClick = (
    item: Linea | Estacion | Parametro,
    type: ResourceType
  ) => {
    // 2. Lógica de navegación (para página /lineas)
    if (contexto === "pagina" && (type === "linea" || type === "estacion")) {
      if (onClose) onClose();
      if (type === "linea") {
        navigate(`/lineas/${item.id}/editar`);
      } else {
        const lineaPadre = lineas?.find((linea) =>
          linea.estaciones.some((est) => est.id === item.id)
        );
        if (lineaPadre) {
          navigate(`/lineas/${lineaPadre.id}/estaciones/${item.id}/editar`);
        } else {
          toast.error("No se pudo determinar la línea padre.");
        }
      }
    } else {
      // 3. Lógica de Modal (para Sidebar o Parámetros)
      let dataForModal: any = {};

      if (type === "linea") {
        const lineaItem = item as Linea;
        dataForModal = {
          nombre: lineaItem.nombre,
          descripcion: lineaItem.descripcion,
          opcuaUrl: lineaItem.opcuaUrl,
          limiteReprocesos: lineaItem.limiteReprocesos, // <--- AGREGAR ESTO
        };
      } else if (type === "estacion") {
        const estacionItem = item as Estacion;
        dataForModal = {
          nombreEstacion: estacionItem.nombreEstacion,
          orden: estacionItem.orden,
          triggerNodeId: estacionItem.triggerNodeId,
          serieNodeId: estacionItem.serieNodeId,
        };
      } else if (type === "parametro") {
        const paramItem = item as Parametro;
        dataForModal = {
          nombreParametro: paramItem.nombreParametro,
          direccionOpcUa: paramItem.direccionOpcUa,
          tipo: paramItem.tipo,
          valorMin:
            paramItem.valorMin != null ? Number(paramItem.valorMin) : null,
          valorMax:
            paramItem.valorMax != null ? Number(paramItem.valorMax) : null,
          valorBooleanoOK: paramItem.valorBooleanoOK,
        };
      }
      onEditItem({ id: item.id, type: type, data: dataForModal });
    }
  };

  // 8. REFACTORIZADO: Ahora solo notifica al padre
  const handleAddParamClick = (estacion: Estacion) => {
    onAddParam(estacion);
  };

  // --- Lógica de Renderizado ---
  if (isLoading)
    return (
      <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-sm">
        {" "}
        Cargando...{" "}
      </div>
    );
  if (isError)
    return (
      <div className="p-4 text-center text-red-500 text-sm">
        {" "}
        Error al cargar: {error?.message || "Desconocido"}{" "}
      </div>
    );
  if (isCollapsed && contexto === "sidebar") return null;

  const renderNode = (
    item: Linea | Estacion | Parametro,
    type: ResourceType
  ) => {
    const uniqueId = `${type}-${item.id}`;
    const isExpanded = expandedNodes.includes(uniqueId);

    // ==========================================================
    // --- BUG 2 CORREGIDO: Lógica de UI mejorada ---
    // ==========================================================
    const isLinea = type === "linea";
    const isEstacion = type === "estacion";

    // Un nodo PUEDE expandirse si es una Línea o una Estación.
    // (Incluso si están vacías, para mostrar el mensaje "No tiene...")
    const canExpand = isLinea || isEstacion;

    // Un nodo TIENE hijos si su array tiene elementos.
    const hasChildren =
      (isLinea && !!(item as Linea).estaciones?.length) ||
      (isEstacion && !!(item as Estacion).parametros?.length);
    // --- Fin Corrección 2 ---

    let displayName = "";
    if (type === "linea") displayName = (item as Linea).nombre;
    else if (type === "estacion")
      displayName = (item as Estacion).nombreEstacion;
    else displayName = (item as Parametro).nombreParametro;

    const indentationClass = isLinea ? "ml-0" : isEstacion ? "ml-3" : "ml-6";

    return (
      <motion.div
        key={uniqueId}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`${indentationClass} mt-1`}
      >
        <div
          className={`flex items-center justify-between p-1 rounded-md group text-gray-300 dark:text-gray-400 ${
            contexto === "pagina"
              ? "hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
              : "hover:bg-gray-700 dark:hover:bg-gray-600 hover:text-white dark:hover:text-gray-100"
          }`}
        >
          {/* Nombre y Expansor */}
          <div
            className="flex items-center cursor-pointer flex-grow min-w-0 mr-2"
            onClick={() => canExpand && toggleNode(uniqueId)} // <-- CORRECCIÓN 2
          >
            {/* Usar 'canExpand' para mostrar la flecha */}
            {canExpand ? ( // <-- CORRECCIÓN 2
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                className="mr-1 text-gray-500 group-hover:text-current flex-shrink-0"
              >
                <FaChevronRight size={10} />
              </motion.div>
            ) : (
              // Es un Parámetro (hoja), no expandible
              <span className="mr-1 w-[10px] inline-block flex-shrink-0"></span>
            )}
            <span
              className={`text-sm ${isLinea ? "font-semibold" : ""} ${
                contexto === "pagina"
                  ? "text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white"
                  : ""
              } ${
                contexto === "sidebar"
                  ? "whitespace-nowrap overflow-hidden overflow-ellipsis"
                  : "break-words"
              }`}
              title={displayName}
            >
              {displayName}
            </span>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {isLinea && (
              <Link
                to={`/lineas/${item.id}/crear-estacion`}
                title="Agregar Estación"
                onClick={onClose}
              >
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  className="hover:text-green-500 dark:hover:text-green-400"
                >
                  <FaPlus size={12} />
                </motion.button>
              </Link>
            )}
            {isEstacion && (
              <motion.button
                onClick={() => handleAddParamClick(item as Estacion)}
                whileHover={{ scale: 1.1 }}
                className="hover:text-green-500 dark:hover:text-green-400"
                title="Agregar Parámetro"
              >
                <FaPlus size={12} />
              </motion.button>
            )}
            <motion.button
              onClick={() => handleEditClick(item, type)}
              whileHover={{ scale: 1.1 }}
              className="hover:text-blue-500 dark:hover:text-blue-400"
              title="Editar"
            >
              <FaEdit size={12} />
            </motion.button>
            <motion.button
              onClick={() => handleDeleteClick(item, type)}
              whileHover={{ scale: 1.1 }}
              className="hover:text-red-500 dark:hover:text-red-400"
              title="Eliminar"
            >
              <FaTrashAlt size={12} />
            </motion.button>
          </div>
        </div>

        {/* Hijos */}
        <AnimatePresence>
          {/* --- CORRECCIÓN 2: Lógica de renderizado de "vacío" --- */}
          {isExpanded && canExpand && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden border-l border-gray-700 dark:border-gray-600 ml-[6px]"
            >
              {/* Lógica para LÍNEA */}
              {isLinea &&
                hasChildren &&
                (item as Linea).estaciones
                  ?.sort((a, b) => a.orden - b.orden)
                  .map((est) => renderNode(est, "estacion"))}
              {isLinea && !hasChildren && (
                <span className="ml-6 text-xs italic text-gray-500 dark:text-gray-500">
                  (No tiene estaciones)
                </span>
              )}

              {/* Lógica para ESTACIÓN */}
              {isEstacion &&
                hasChildren &&
                (item as Estacion).parametros?.map((param) =>
                  renderNode(param, "parametro")
                )}
              {isEstacion && !hasChildren && (
                <span className="ml-9 text-xs italic text-gray-500 dark:text-gray-500">
                  (No tiene parámetros)
                </span>
              )}
            </motion.div>
          )}
          {/* --- Fin Corrección 2 --- */}
        </AnimatePresence>
      </motion.div>
    );
  };

  // --- Renderizado Principal del Componente ---
  return (
    <>
      {/* Cabecera */}
      <div
        className={`flex justify-between items-center mb-3 ${
          contexto === "pagina" ? "px-1" : "pr-1"
        }`}
      >
        {contexto === "pagina" ? (
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Estructura de Líneas
          </h3>
        ) : (
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center">
            <FaSitemap className="mr-2" /> Estructura
          </h3>
        )}
        <Link to="/lineas/crear" onClick={onClose}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="text-white bg-blue-600 rounded-full p-2 hover:bg-blue-700 shadow-md flex items-center justify-center w-8 h-8"
            title="Crear nueva línea"
          >
            <FaPlus size={12} />
          </motion.button>
        </Link>
      </div>

      {/* Cuerpo del Árbol */}
      <div
        className={`space-y-1 ${
          contexto === "pagina" ? "max-h-[70vh] overflow-y-auto pr-2" : ""
        }`}
      >
        {lineas && lineas.length > 0 ? (
          lineas.map((linea) => renderNode(linea, "linea"))
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic px-2">
            No hay líneas de producción creadas.
          </p>
        )}
      </div>
    </>
  );
};

export default LineasTree;
