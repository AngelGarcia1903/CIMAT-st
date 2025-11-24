import React from "react";
import Modal from "./Modal"; // Reutilizamos nuestro modal base
import { FaExclamationTriangle } from "react-icons/fa";

interface SessionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void; // onClose ahora manejará la redirección
}

const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onClose}
      title={
        <div className="flex items-center text-yellow-600 dark:text-yellow-400">
          <FaExclamationTriangle className="mr-3" size={24} />
          Sesión Expirada
        </div>
      }
      //  Texto ajustado para ser más preciso
      body="Tu sesión ha finalizado porque el token de acceso ha expirado. Por favor, inicia sesión de nuevo para continuar."
      confirmText="Entendido"
      showCancelButton={false} // Solo un botón de acción
    >
      {/* Sin contenido adicional */}
    </Modal>
  );
};

export default SessionExpiredModal;
