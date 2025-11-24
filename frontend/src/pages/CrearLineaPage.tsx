import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProductionLine } from "../services/api"; // Asegúrate que la importación no tenga .ts si usas Vite/CRA normal
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Modal from "../components/common/Modal";

const CrearLineaPage: React.FC = () => {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [opcuaUrl, setOpcuaUrl] = useState(""); // <-- V5: NUEVO ESTADO
  const navigate = useNavigate();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    // Ahora pasamos también opcuaUrl
    mutationFn: (data: any) => createProductionLine(data),
    onSuccess: (data) => {
      toast.success("Línea creada con éxito.");
      queryClient.refetchQueries({ queryKey: ["lineas"] });
      navigate(`/lineas/${data.id}/crear-estacion`);
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.response?.data?.message || error.message}`);
    },
  });

  const doCreateLinea = () => {
    setShowConfirmModal(false);
    mutate({ nombre, descripcion, opcuaUrl }); // <-- V5: ENVIAR URL
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (descripcion.trim() === "") {
      setShowConfirmModal(true);
    } else {
      doCreateLinea();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700"
    >
      <h2 className="text-3xl font-bold text-center text-blue-600 dark:text-blue-400 mb-6">
        Crear Nueva Línea de Producción
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
            Nombre de la Línea *
          </label>
          <input
            type="text"
            maxLength={50}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        {/* --- V5: CAMPO NUEVO PARA URL --- */}
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
          <p className="text-xs text-gray-500 mt-1">
            Si se deja vacío, esta línea no será monitoreada.
          </p>
        </div>
        {/* -------------------------------- */}
        <div>
          <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
            Descripción (Opcional)
          </label>
          <textarea
            value={descripcion}
            maxLength={255}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            rows={4}
            placeholder="Añade una breve descripción..."
          />
        </div>
        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={isPending}
          className="w-full py-3 mt-4 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50"
        >
          {isPending ? "Creando..." : "Crear Línea y Continuar"}
        </motion.button>
      </form>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={doCreateLinea}
        title="Confirmar Creación"
        body="La línea no tiene descripción. ¿Deseas continuar?"
        confirmText="Sí, Crear"
        isProcessing={isPending}
      />
    </motion.div>
  );
};

export default CrearLineaPage;
