import React, { type ReactNode } from "react"; // Importar ReactNode
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void; // Hacer onConfirm opcional
  title: ReactNode;
  body?: ReactNode; // Permitir JSX también en el cuerpo
  children?: ReactNode; // Para contenido personalizado
  confirmText?: string;
  cancelText?: string;
  isProcessing?: boolean;
  showCancelButton?: boolean; // Para ocultar el botón de cancelar si no es necesario
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  body,
  children,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isProcessing = false,
  showCancelButton = true, // Por defecto se muestra
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"
          onClick={onClose} // Cierra al hacer clic fuera
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            // ---  AQUÍ ESTÁN LOS CAMBIOS DE RESPONSIVIDAD ---
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            // -------------------------------------------------
            onClick={(e) => e.stopPropagation()} // Evita que el clic dentro cierre el modal
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Cuerpo */}
            {/* ---  AÑADIDO overflow-y-auto PARA SCROLL INTERNO --- */}
            <div className="p-6 text-gray-700 dark:text-gray-300 overflow-y-auto">
              {body && <p className="mb-4">{body}</p>}
              {children}
            </div>

            {/* Pie (Botones) */}
            {(onConfirm || showCancelButton) && ( // Solo muestra el pie si hay al menos un botón
              <div className="flex justify-end p-4 bg-gray-50 dark:bg-gray-700 border-t dark:border-gray-600 space-x-3">
                {showCancelButton && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onClose}
                    disabled={isProcessing}
                    className="py-2 px-4 border border-gray-300 dark:border-gray-500 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition disabled:opacity-50"
                  >
                    {cancelText}
                  </motion.button>
                )}
                {onConfirm && ( // Renderiza el botón de confirmar solo si la función existe
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onConfirm}
                    disabled={isProcessing}
                    className="py-2 px-5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {isProcessing ? "Procesando..." : confirmText}
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
