import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import SessionExpiredModal from "./../components/common/SessionExpiredModal"; // Crearemos este modal

// Define la forma del contexto
interface AuthErrorContextType {
  showSessionExpiredModal: () => void; // Función para mostrar el modal
}

// Crea el contexto con un valor inicial por defecto (puede ser null o un objeto vacío)
const AuthErrorContext = createContext<AuthErrorContextType | undefined>(
  undefined
);

// Proveedor del contexto: envuelve la aplicación y maneja el estado
export const AuthErrorProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showSessionExpiredModal = () => {
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    // Forzar redirección al login al cerrar el modal
    window.location.href = "/login";
  };

  // El valor que proporcionará el contexto
  const contextValue = {
    showSessionExpiredModal,
  };

  return (
    <AuthErrorContext.Provider value={contextValue}>
      {children}
      {/* Renderiza el modal aquí, controlado por el estado */}
      <SessionExpiredModal isOpen={isModalVisible} onClose={closeModal} />
    </AuthErrorContext.Provider>
  );
};

// Hook personalizado para usar el contexto fácilmente en otros componentes
export const useAuthError = (): AuthErrorContextType => {
  const context = useContext(AuthErrorContext);
  if (context === undefined) {
    throw new Error("useAuthError must be used within an AuthErrorProvider");
  }
  return context;
};

// Exportamos una función global para que el interceptor pueda llamar al modal
// Es un pequeño "hack" porque los interceptores se configuran fuera del árbol de React
let globalShowModal: () => void = () => {
  console.error("AuthErrorContext not initialized yet for global access");
};

export const triggerSessionExpiredModal = () => {
  if (globalShowModal) {
    globalShowModal();
  }
};

// Hook para inicializar la función global dentro del proveedor
export const useInitializeAuthErrorHandling = () => {
  const { showSessionExpiredModal } = useAuthError();
  useEffect(() => {
    globalShowModal = showSessionExpiredModal;
    // Limpieza opcional al desmontar
    return () => {
      // globalShowModal = () => { console.error("...") }; // Resetear si es necesario
    };
  }, [showSessionExpiredModal]);
};
