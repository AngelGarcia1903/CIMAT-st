import React from "react";
import { Link } from "react-router-dom";
// framer-motion no se usa aquí

// Importing necessary icons
import {
  FaHome,
  FaCog,
  FaSlidersH,
  FaUsers,
  FaNetworkWired,
  FaUserCog,
  FaHistory,
  FaTimes,
} from "react-icons/fa";
import LineasTree from "../Lineas/LineasTree";
import { useAuth } from "../../hooks/useAuth";
import { Rol, type RolType } from "../../types"; // Importar RolType

// --- Tipos para los Callbacks (deben coincidir con LineasTree) ---
type ResourceType = "linea" | "estacion" | "parametro";
interface Estacion {
  id: number;
  nombreEstacion: string;
  orden: number;
  parametros: any[]; // <-- AÑADIR ESTA LÍNEA
}
// --- Fin Tipos ---

//  1. INTERFAZ DE PROPS ACTUALIZADA
interface SidebarProps {
  isCollapsed: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
  // Nuevas props para "elevar" el estado del modal
  onDeleteItem: (item: {
    id: number;
    type: ResourceType;
    name: string;
  }) => void;
  onEditItem: (item: { id: number; type: ResourceType; data: any }) => void;
  onAddParam: (station: Estacion) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  mobileOpen = false,
  onClose,
  //  2. RECIBIR LAS NUEVAS PROPS
  onDeleteItem,
  onEditItem,
  onAddParam,
}) => {
  const { userRole } = useAuth();

  const linkClasses = `flex items-center p-2 rounded-md transition-colors duration-200 hover:bg-gray-700 dark:hover:bg-gray-600`;
  const collapsedLinkClasses = `justify-center`;

  // <-- MODIFICADO: Cambiado 'transition-transform duration-300' por 'transition-all duration-500 ease-in-out'
  const baseClasses =
    "fixed left-0 top-0 h-full bg-gray-800 dark:bg-gray-900 text-white transition-all duration-500 ease-in-out z-50 flex flex-col";
  const mdWidthClass = isCollapsed ? "md:w-20" : "md:w-64";
  const mobileTransform = mobileOpen ? "translate-x-0" : "-translate-x-full";

  return (
    <>
      {/* Backdrop (sin cambios) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <nav
        className={`${baseClasses} ${mdWidthClass} ${mobileTransform} w-full md:translate-x-0`}
      >
        {/* Header (sin cambios) */}
        <div className="flex items-center justify-center h-16 border-b border-gray-700 dark:border-gray-600 flex-shrink-0">
          <h1
            className={`text-2xl font-bold text-blue-500 dark:text-blue-400 whitespace-nowrap ${
              isCollapsed ? "hidden" : "block"
            }`}
          >
            Panel
          </h1>
          <FaNetworkWired
            className={`w-8 h-8 text-blue-500 ${
              isCollapsed ? "block" : "hidden"
            }`}
          />
          {mobileOpen && (
            <button
              onClick={onClose}
              className="absolute right-3 top-3 text-white md:hidden p-2 rounded-md"
              aria-label="Cerrar menú"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Links de Navegación (sin cambios, ya tienen onClose) */}
        <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 dark:bg-gray-800">
          <Link
            to="/home"
            onClick={onClose}
            className={`${linkClasses} ${
              isCollapsed ? collapsedLinkClasses : ""
            }`}
            title={isCollapsed ? "Dashboard" : ""}
          >
            <FaHome className="w-6 h-6 flex-shrink-0" />
            <span
              className={`ml-3 whitespace-nowrap ${
                isCollapsed ? "hidden" : "block"
              }`}
            >
              Dashboard
            </span>
          </Link>

          <Link
            to="/historial"
            onClick={onClose}
            className={`mt-2 ${linkClasses} ${
              isCollapsed ? collapsedLinkClasses : ""
            }`}
            title={isCollapsed ? "Historial" : ""}
          >
            <FaHistory className="w-6 h-6 flex-shrink-0" />
            <span
              className={`ml-3 whitespace-nowrap ${
                isCollapsed ? "hidden" : "block"
              }`}
            >
              Historial
            </span>
          </Link>

          {(userRole === Rol.admin || userRole === Rol.superadmin) && (
            <>
              <Link
                to="/lineas"
                onClick={onClose}
                className={`mt-2 ${linkClasses} ${
                  isCollapsed ? collapsedLinkClasses : ""
                }`}
                title={isCollapsed ? "Configuración" : ""}
              >
                <FaCog className="w-6 h-6 flex-shrink-0" />
                <span
                  className={`ml-3 whitespace-nowrap ${
                    isCollapsed ? "hidden" : "block"
                  }`}
                >
                  Configuración
                </span>
              </Link>
              <Link
                to="/registro-manual"
                onClick={onClose}
                className={`mt-2 ${linkClasses} ${
                  isCollapsed ? collapsedLinkClasses : ""
                }`}
                title={isCollapsed ? "Registro Manual" : ""}
              >
                <FaSlidersH className="w-6 h-6 flex-shrink-0" />
                <span
                  className={`ml-3 whitespace-nowrap ${
                    isCollapsed ? "hidden" : "block"
                  }`}
                >
                  Registro Manual
                </span>
              </Link>
            </>
          )}

          {userRole === Rol.admin && (
            <Link
              to="/ver-operadores"
              onClick={onClose}
              className={`mt-2 ${linkClasses} ${
                isCollapsed ? collapsedLinkClasses : ""
              }`}
              title={isCollapsed ? "Ver Operadores" : ""}
            >
              <FaUserCog className="w-6 h-6 flex-shrink-0" />{" "}
              <span
                className={`ml-3 whitespace-nowrap ${
                  isCollapsed ? "hidden" : "block"
                }`}
              >
                Ver Operadores
              </span>
            </Link>
          )}

          {userRole === Rol.superadmin && (
            <Link
              to="/usuarios"
              onClick={onClose}
              className={`mt-2 ${linkClasses} ${
                isCollapsed ? collapsedLinkClasses : ""
              }`}
              title={isCollapsed ? "Gestionar Usuarios" : ""}
            >
              <FaUsers className="w-6 h-6 flex-shrink-0" />
              <span
                className={`ml-3 whitespace-nowrap ${
                  isCollapsed ? "hidden" : "block"
                }`}
              >
                Gestionar Usuarios
              </span>
            </Link>
          )}

          {/* LineasTree component */}
          {(userRole === Rol.admin || userRole === Rol.superadmin) &&
            !isCollapsed && (
              <div className="mt-4 pt-4 border-t border-gray-700 dark:border-gray-600">
                {/*  3. PASAR LAS NUEVAS PROPS AL ÁRBOL */}
                <LineasTree
                  isCollapsed={isCollapsed}
                  contexto="sidebar"
                  onClose={onClose}
                  onDeleteItem={onDeleteItem}
                  onEditItem={onEditItem}
                  onAddParam={onAddParam}
                />
              </div>
            )}
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
