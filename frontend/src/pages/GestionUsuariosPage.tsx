import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOperadores,
  getAdmins,
  createUser,
  updateUser,
  deleteUser,
} from "../services/api";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FaPlus,
  FaUsers,
  FaUserShield,
  FaUserCog,
  FaEdit,
  FaTrashAlt,
} from "react-icons/fa";
import Modal from "../components/common/Modal"; // Modal de confirmación
import EditUserModal from "../components/common/EditUserModal"; // Nuevo modal de edición

// Interfaz para el tipo de usuario
interface User {
  id: number;
  username: string;
  rol: "admin" | "operador";
}

const GestionUsuariosPage: React.FC = () => {
  const queryClient = useQueryClient();
  // Estados para el formulario de creación
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRol, setNewRol] = useState<"admin" | "operador">("operador");
  // Estados para modales
  const [activeTab, setActiveTab] = useState<"operadores" | "admins">(
    "operadores"
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const queryOptions = {
    //  EVITA RECARGA AL CAMBIAR DE VENTANA
    refetchOnWindowFocus: false,
    //  CONSIDERA LOS DATOS "FRESCOS" POR 1 HORA (o el tiempo que estimes conveniente)
    staleTime: 1000 * 60 * 60,
  };

  // --- Queries ---
  const { data: operadores, isLoading: isLoadingOps } = useQuery<User[]>({
    queryKey: ["operadores"],
    queryFn: getOperadores,
    ...queryOptions, // Aplicar opciones
  });
  const { data: admins, isLoading: isLoadingAdmins } = useQuery<User[]>({
    queryKey: ["admins"],
    queryFn: getAdmins,
    ...queryOptions, // Aplicar opciones
  });

  // --- Mutaciones ---
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (newUser) => {
      toast.success(`Usuario '${newUser.username}' (${newUser.rol}) creado.`);
      queryClient.invalidateQueries({
        queryKey: [newUser.rol === "admin" ? "admins" : "operadores"],
      });
      setNewUsername("");
      setNewPassword("");
      setNewRol("operador");
    },
    onError: (error: any) =>
      toast.error(`Error: ${error.response?.data?.message || error.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { userId: number; userData: any }) =>
      updateUser(data.userId, data.userData),
    onSuccess: (updatedUser) => {
      toast.success(`Usuario '${updatedUser.username}' actualizado.`);
      queryClient.invalidateQueries({
        queryKey: [updatedUser.rol === "admin" ? "admins" : "operadores"],
      });
      queryClient.invalidateQueries({
        queryKey: [updatedUser.rol === "admin" ? "operadores" : "admins"],
      }); // Invalida ambos por si cambió el rol
      setIsEditModalOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) =>
      toast.error(`Error: ${error.response?.data?.message || error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: (_, _userId) => {
      toast.success(`Usuario eliminado.`);
      // Determina qué query invalidar basado en el rol del usuario eliminado
      const roleKey = selectedUser?.rol === "admin" ? "admins" : "operadores";
      queryClient.invalidateQueries({ queryKey: [roleKey] });
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) =>
      toast.error(`Error: ${error.response?.data?.message || error.message}`),
  });

  // --- Manejadores ---
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      username: newUsername,
      password: newPassword,
      rol: newRol,
    });
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser.id);
    }
  };

  // --- Renderizado ---
  const isLoading = isLoadingOps || isLoadingAdmins;
  const usersToShow = activeTab === "operadores" ? operadores : admins;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center">
        <FaUsers className="mr-3" /> Gestión de Usuarios
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna del Formulario de Creación */}
        <motion.div
          className="lg:col-span-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <FaPlus className="mr-2" /> Crear Nuevo Usuario
            </h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* ... (inputs para username, password, rol sin cambios) ... */}
              <div>
                <label className="block text-sm font-medium">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  className="w-full p-2 mt-1 border rounded-md dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Contraseña Inicial
                </label>
                <input
                  type="password"
                  maxLength={50}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full p-2 mt-1 border rounded-md dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Rol</label>
                <select
                  value={newRol}
                  onChange={(e) =>
                    setNewRol(e.target.value as "admin" | "operador")
                  }
                  required
                  className="w-full p-2 mt-1 border rounded-md dark:bg-gray-700"
                >
                  <option value="operador">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creando..." : "Crear Usuario"}
              </button>
            </form>
          </div>
        </motion.div>

        {/* Columna de la Tabla */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {/* Pestañas */}
          <div className="mb-4 flex border-b dark:border-gray-700">
            <button
              onClick={() => setActiveTab("operadores")}
              className={`py-2 px-4 text-lg font-medium flex items-center ${
                activeTab === "operadores"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-blue-600"
              }`}
            >
              <FaUserCog className="mr-2" /> Operadores (
              {operadores?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("admins")}
              className={`py-2 px-4 text-lg font-medium flex items-center ${
                activeTab === "admins"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-blue-600"
              }`}
            >
              <FaUserShield className="mr-2" /> Administradores (
              {admins?.length || 0})
            </button>
          </div>

          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <table className="min-w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">ID</th>
                  <th className="py-3 px-4 text-left font-bold">Username</th>
                  <th className="py-3 px-4 text-left font-bold">Rol</th>
                  <th className="py-3 px-4 text-center font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && !usersToShow ? (
                  <tr>
                    <td colSpan={5} className="text-center p-4">
                      Cargando...
                    </td>
                  </tr>
                ) : (
                  usersToShow?.map((user: User) => (
                    <tr
                      key={user.id}
                      className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-3 px-4">{user.id}</td>
                      <td className="py-3 px-4 font-medium">{user.username}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.rol === "admin"
                              ? "bg-blue-200 text-blue-800"
                              : "bg-green-200 text-green-800"
                          }`}
                        >
                          {user.rol}
                        </span>
                      </td>
                      {/* Columna de Estado (Simulada por ahora) */}

                      {/* Columna de Acciones */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-500 hover:text-blue-700 mr-3"
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="text-red-500 hover:text-red-700"
                          title="Eliminar"
                        >
                          <FaTrashAlt />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {!isLoading && (!usersToShow || usersToShow.length === 0) && (
                  <tr>
                    <td colSpan={5} className="text-center p-4 text-gray-500">
                      No hay usuarios en esta categoría.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Modales */}
      {selectedUser && (
        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onSave={(userId, data) =>
            updateMutation.mutate({ userId, userData: data })
          }
          isProcessing={updateMutation.isPending}
        />
      )}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={confirmDelete}
        title="Confirmar Eliminación"
        body={`¿Estás seguro de que quieres eliminar al usuario '${selectedUser?.username}'? Esta acción es irreversible.`}
        confirmText="Sí, Eliminar"
        isProcessing={deleteMutation.isPending}
      />
    </motion.div>
  );
};

export default GestionUsuariosPage;
