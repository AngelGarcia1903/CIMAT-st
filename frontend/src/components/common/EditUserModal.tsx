import React, { useState, useEffect } from "react";
import Modal from "./Modal";
//  CORRECCIÓN: Importar desde nuestro archivo de tipos del frontend
import { Rol, type RolType } from "../../types";

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: number; username: string; rol: RolType }; // <-- Usar RolType
  onSave: (userId: number, data: any) => void;
  isProcessing: boolean;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
  isProcessing,
}) => {
  const [username, setUsername] = useState("");
  const [rol, setRol] = useState<RolType>(Rol.operador); // <-- Usar RolType y valor por defecto del objeto Rol
  const [password, setPassword] = useState(""); // Para reseteo opcional

  // Actualizar estado local cuando el usuario seleccionado cambie
  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setRol(user.rol);
      setPassword(""); // Limpiar campo de contraseña cada vez que se abre
    }
  }, [user]);

  const handleSave = () => {
    const dataToSave: any = {
      username,
      rol,
    };
    // Solo incluir la contraseña si el campo no está vacío
    if (password.trim()) {
      dataToSave.password = password;
    }
    onSave(user.id, dataToSave);
  };

  // No renderizar si no hay usuario (prevención de errores)
  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleSave}
      title={`Editar Usuario: ${user.username}`}
      confirmText="Guardar Cambios"
      isProcessing={isProcessing}
    >
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nombre de Usuario
          </label>
          <input
            type="text"
            maxLength={50}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full p-2 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Rol
          </label>
          {/* Usamos RolType para el estado, pero los valores del select son las claves del objeto Rol */}
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as RolType)}
            required
            className="w-full p-2 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          >
            {/* Iterar sobre las claves del objeto Rol si se prefiere */}
            <option value={Rol.operador}>Operador</option>
            <option value={Rol.admin}>Administrador</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Resetear Contraseña (opcional)
          </label>
          <input
            type="password"
            maxLength={50}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Dejar en blanco para no cambiar"
            className="w-full p-2 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
      </form>
    </Modal>
  );
};

export default EditUserModal;
