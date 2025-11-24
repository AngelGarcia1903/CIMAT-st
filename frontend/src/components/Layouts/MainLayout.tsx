import React, { useState } from "react";
import { motion } from "framer-motion";
import { Outlet, useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "./Sidebar";
import useWindowSize from "../../hooks/useWindowSize";
import Modal from "../common/Modal";
import EditResourceModal from "../common/EditResourceModal";
import { FaSignOutAlt } from "react-icons/fa";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteResource,
  updateProductionLine,
  updateStation,
  updateParameter,
  createParameterForStation,
} from "../../services/api";

// --- Tipos para los Modales ---
type ResourceType = "linea" | "estacion" | "parametro";
interface Estacion {
  id: number;
  nombreEstacion: string;
  orden: number;
  parametros: any[];
}
interface ItemToDelete {
  id: number;
  type: ResourceType;
  name: string;
}
interface ItemToEdit {
  id: number;
  type: ResourceType;
  data: any;
}
const defaultParamResource = {
  nombreParametro: "",
  direccionOpcUa: "",
  tipo: "numerico",
  valorMin: null,
  valorMax: null,
};

//  2. CREAR Y EXPORTAR UN TIPO PARA EL CONTEXTO
// Esto le dirá a LineasPage.tsx qué funciones esperar.
export type LineasTreeContextType = {
  onDeleteItem: (item: ItemToDelete) => void;
  onEditItem: (item: ItemToEdit) => void;
  onAddParam: (station: Estacion) => void;
};
// --- Fin Tipos ---

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isMdUp } = useWindowSize();

  // --- Estados del Layout ---
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // --- Estados de los Modales ---
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: ItemToDelete | null;
  }>({ isOpen: false, item: null });
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    item: ItemToEdit | null;
  }>({ isOpen: false, item: null });
  const [addParamModal, setAddParamModal] = useState<{
    isOpen: boolean;
    station: Estacion | null;
  }>({ isOpen: false, station: null });

  // --- Manejadores del Layout ---
  const toggleSidebar = () => {
    if (isMdUp) {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    } else {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    }
  };
  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Sesión cerrada con éxito");
    navigate("/login");
  };

  // --- Mutaciones (Sin cambios) ---
  const deleteMutation = useMutation({
    mutationFn: (variables: { resourceType: ResourceType; id: number }) =>
      deleteResource(variables.resourceType, variables.id.toString()),
    onSuccess: (_, variables) => {
      toast.success(`${variables.resourceType} eliminado.`);
      queryClient.invalidateQueries({ queryKey: ["lineas"] });
      setDeleteModal({ isOpen: false, item: null });
    },
    onError: (error: any, variables) => {
      toast.error(
        `Error al eliminar ${variables.resourceType}: ${
          error.response?.data?.message || error.message
        }`
      );
      setDeleteModal({ isOpen: false, item: null });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (variables: {
      type: ResourceType;
      id: number;
      data: any;
    }) => {
      const stringId = variables.id.toString();
      switch (variables.type) {
        case "linea":
          return updateProductionLine(stringId, variables.data);
        case "estacion":
          return updateStation(stringId, variables.data);
        case "parametro":
          return updateParameter(stringId, variables.data);
        default:
          throw new Error("Tipo de recurso desconocido");
      }
    },
    onSuccess: (_data, variables) => {
      toast.success(`${variables.type} actualizado.`);

      // 1. Actualizar el Árbol del Sidebar (Siempre)
      queryClient.invalidateQueries({ queryKey: ["lineas"] });

      // 2. Sincronización Bidireccional:
      // Si editamos una LÍNEA desde el modal, invalidamos también su vista de detalle
      // por si el usuario tiene abierta la página "/lineas/:id/editar" de fondo.
      if (variables.type === "linea") {
        queryClient.invalidateQueries({
          queryKey: ["lineaDetails", variables.id.toString()],
        });
      }

      setEditModal({ isOpen: false, item: null });
    },
    onError: (error: any, variables) => {
      toast.error(
        `Error al actualizar ${variables.type}: ${
          error.response?.data?.message || error.message
        }`
      );
    },
  });

  const createParamMutation = useMutation({
    mutationFn: createParameterForStation,
    onSuccess: (newParam) => {
      toast.success(`Parámetro '${newParam.nombreParametro}' creado.`);
      queryClient.invalidateQueries({ queryKey: ["lineas"] });
      setAddParamModal({ isOpen: false, station: null });
    },
    onError: (error: any) => {
      toast.error(
        `Error al crear parámetro: ${
          error.response?.data?.message || error.message
        }`
      );
    },
  });

  // --- Manejadores de Modales ---
  const handleOpenDeleteModal = (item: ItemToDelete) =>
    setDeleteModal({ isOpen: true, item });
  const handleOpenEditModal = (item: ItemToEdit) =>
    setEditModal({ isOpen: true, item });
  const handleOpenAddParamModal = (station: Estacion) =>
    setAddParamModal({ isOpen: true, station });

  // ... (handleConfirmDelete, handleSaveEdit, handleSaveNewParam - sin cambios)
  const handleConfirmDelete = () => {
    if (deleteModal.item) {
      deleteMutation.mutate({
        resourceType: deleteModal.item.type,
        id: deleteModal.item.id,
      });
    }
  };

  const handleSaveEdit = (
    resourceId: number,
    resourceType: ResourceType,
    data: any
  ) => {
    if (resourceType === "parametro" && data.tipo === "numerico") {
      const minVal =
        data.valorMin != null && data.valorMin !== ""
          ? Number(data.valorMin)
          : null;
      const maxVal =
        data.valorMax != null && data.valorMax !== ""
          ? Number(data.valorMax)
          : null;
      if (minVal !== null && maxVal !== null && minVal > maxVal) {
        toast.error("El valor mínimo no puede ser mayor que el valor máximo.");
        return;
      }
      data.valorMin = minVal;
      data.valorMax = maxVal;
    }
    const { opciones, opcionCorrecta, ...dataToSave } = data;
    updateMutation.mutate({
      type: resourceType,
      id: resourceId,
      data: dataToSave,
    });
  };

  const handleSaveNewParam = (
    _resourceId: number,
    resourceType: ResourceType,
    data: any
  ) => {
    if (resourceType !== "parametro" || !addParamModal.station) {
      toast.error("Error interno: Contexto incorrecto.");
      return;
    }
    if (!data.nombreParametro?.trim() || !data.direccionOpcUa?.trim()) {
      toast.error("Nombre y Dirección OPC son obligatorios.");
      return;
    }
    if (data.tipo === "numerico") {
      const minVal =
        data.valorMin != null && data.valorMin !== ""
          ? Number(data.valorMin)
          : null;
      const maxVal =
        data.valorMax != null && data.valorMax !== ""
          ? Number(data.valorMax)
          : null;
      if (minVal !== null && maxVal !== null && minVal > maxVal) {
        toast.error("Mínimo no puede ser mayor que máximo.");
        return;
      }
      data.valorMin = minVal;
      data.valorMax = maxVal;
    }
    const { opciones, opcionCorrecta, ...dataToSave } = data;
    createParamMutation.mutate({
      estacionId: addParamModal.station.id,
      parametroData: dataToSave,
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Toaster />

      {/* Sidebar recibe las props (esto ya estaba bien) */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        mobileOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onDeleteItem={handleOpenDeleteModal}
        onEditItem={handleOpenEditModal}
        onAddParam={handleOpenAddParamModal}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out min-w-0 ${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        {/* Cabecera Fija (sin cambios) */}
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 bg-white dark:bg-gray-800 shadow-md h-16 border-b dark:border-gray-700 flex-shrink-0">
          <button
            onClick={toggleSidebar}
            className="text-gray-600 dark:text-gray-300 focus:outline-none p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </button>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400"
          >
            Sistema de Trazabilidad
          </motion.h1>
          <motion.button
            onClick={() => setShowLogoutModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="py-2 px-3 text-sm md:py-2 md:px-4 md:text-base bg-red-600 text-white rounded-md flex items-center hover:bg-red-700 transition-colors"
          >
            <FaSignOutAlt className="mr-0 md:mr-2" />
            <span className="hidden md:inline">Salir</span>
          </motion.button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {/*  3. PASAR LAS FUNCIONES COMO 'CONTEXT' AL OUTLET */}
          <Outlet
            context={
              {
                onDeleteItem: handleOpenDeleteModal,
                onEditItem: handleOpenEditModal,
                onAddParam: handleOpenAddParamModal,
              } satisfies LineasTreeContextType
            }
          />
        </main>
      </div>

      {/* ... (Modales - sin cambios) ... */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Confirmar Cierre de Sesión"
        body="¿Estás seguro de que quieres cerrar la sesión?"
        confirmText="Sí, Salir"
      />
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        onConfirm={handleConfirmDelete}
        title="Confirmar Eliminación"
        body={`¿Eliminar '${deleteModal.item?.name}' (${deleteModal.item?.type})? Sus hijos también se eliminarán.`}
        confirmText="Sí, Eliminar"
        isProcessing={deleteMutation.isPending}
      />
      {editModal.item && (
        <EditResourceModal
          isOpen={editModal.isOpen}
          onClose={() => setEditModal({ isOpen: false, item: null })}
          resource={editModal.item.data}
          resourceType={editModal.item.type}
          resourceId={editModal.item.id}
          onSave={handleSaveEdit}
          isProcessing={updateMutation.isPending}
        />
      )}
      {addParamModal.station && (
        <EditResourceModal
          isOpen={addParamModal.isOpen}
          onClose={() => setAddParamModal({ isOpen: false, station: null })}
          resource={defaultParamResource}
          resourceType="parametro"
          resourceId={0}
          onSave={handleSaveNewParam}
          isProcessing={createParamMutation.isPending}
          title={`Agregar Parámetro a ${addParamModal.station.nombreEstacion}`}
          confirmText="Crear Parámetro"
        />
      )}
    </div>
  );
};

export default MainLayout;
