import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOperadores,
  getAdmins,
  createUser,
  updateUser,
  deleteUser,
} from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  FaPlus,
  FaUsers,
  FaUserShield,
  FaUserCog,
  FaEdit,
  FaTrashAlt,
  FaChevronDown,
  FaChevronUp,
  FaSpinner, // Añadido para el indicador de carga
} from "react-icons/fa";
import Modal from "../components/common/Modal";
import EditUserModal from "../components/common/EditUserModal";

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

  // Estados para UI y modales
  const [activeTab, setActiveTab] = useState<"operadores" | "admins">(
    "operadores",
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Estado para colapsar/mostrar el formulario de creación en pantallas pequeñas
  // Por defecto, se muestra en desktop (lg:block), pero se oculta en móvil (a menos que se abra)
  const [showCreateForm, setShowCreateForm] = useState(false);

  const queryOptions = {
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 60,
  };

  // --- Queries ---
  const { data: operadores, isLoading: isLoadingOps } = useQuery<User[]>({
    queryKey: ["operadores"],
    queryFn: getOperadores,
    ...queryOptions,
  });
  const { data: admins, isLoading: isLoadingAdmins } = useQuery<User[]>({
    queryKey: ["admins"],
    queryFn: getAdmins,
    ...queryOptions,
  });

  // --- Mutaciones (CRUD) ---
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (newUser) => {
      toast.success(`Usuario '${newUser?.username}' creado.`);
      queryClient.invalidateQueries({
        queryKey: [newUser?.rol === "admin" ? "admins" : "operadores"],
      });
      // Limpiar y cerrar en móvil
      setNewUsername("");
      setNewPassword("");
      setNewRol("operador");
      setShowCreateForm(false);
    },
    onError: (error: any) =>
      toast.error(`Error al crear usuario: ${error.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { userId: number; userData: any }) =>
      updateUser(data.userId, data.userData),
    onSuccess: (updatedUser) => {
      toast.success(`Usuario '${updatedUser?.username}' actualizado.`);
      // Invalidar ambas queries por si hubo cambio de rol
      queryClient.invalidateQueries({ queryKey: ["operadores"] });
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      setIsEditModalOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) =>
      toast.error(`Error al actualizar: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success(`Usuario eliminado.`);
      // Invalidar ambas queries (aunque solo una se actualice, es más seguro)
      queryClient.invalidateQueries({ queryKey: ["operadores"] });
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => toast.error(`Error al eliminar: ${error.message}`),
  });

  // --- Manejadores ---
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      toast.error("El nombre de usuario y la contraseña son obligatorios.");
      return;
    }
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

  const isLoading = isLoadingOps || isLoadingAdmins;
  const usersToShow = activeTab === "operadores" ? operadores : admins;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-2 md:p-6 max-w-7xl mx-auto"
    >
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center justify-center md:justify-start">
        <FaUsers className="mr-3 text-blue-600 w-8 h-8" /> Gestión de Usuarios
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* --- FORMULARIO DE CREACIÓN (COLAPSABLE EN MÓVIL) --- */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 overflow-hidden">
            {/* Cabecera del Acordeón para móvil */}
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="w-full p-4 flex justify-between items-center bg-blue-50 dark:bg-gray-700/50 lg:bg-transparent lg:cursor-default transition-colors hover:bg-blue-100 dark:hover:bg-gray-700 lg:hover:bg-transparent"
            >
              <h2 className="text-lg font-bold flex items-center text-gray-800 dark:text-white">
                <FaPlus className="mr-2 text-blue-500 w-5 h-5" /> Crear Nuevo
                Usuario
              </h2>
              <div className="lg:hidden text-gray-500">
                {showCreateForm ? (
                  <FaChevronUp className="w-5 h-5" />
                ) : (
                  <FaChevronDown className="w-5 h-5" />
                )}
              </div>
            </button>

            {/* Cuerpo del Formulario con animación de colapso */}
            <AnimatePresence>
              {/* Solo renderiza si showCreateForm es true o si es desktop (lg:block) */}
              {showCreateForm || window.innerWidth >= 1024 ? (
                <motion.div
                  key="create-form"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-6 pt-0 lg:pt-6 overflow-hidden"
                >
                  <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre de Usuario
                      </label>
                      <input
                        type="text"
                        maxLength={50}
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        required
                        placeholder="Ej. operador1"
                        className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-shadow outline-none text-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Contraseña
                      </label>
                      <input
                        type="password"
                        maxLength={50}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="******"
                        className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-shadow outline-none text-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Rol
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setNewRol("operador")}
                          className={`p-2 sm:p-3 rounded-lg text-xs sm:text-sm font-medium transition-colors border shadow-sm ${
                            newRol === "operador"
                              ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-800/30 dark:border-green-700"
                              : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                          }`}
                        >
                          Operador
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewRol("admin")}
                          className={`p-2 sm:p-3 rounded-lg text-xs sm:text-sm font-medium transition-colors border shadow-sm ${
                            newRol === "admin"
                              ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-800/30 dark:border-blue-700"
                              : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                          }`}
                        >
                          Administrador
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md mt-2 flex items-center justify-center gap-2"
                    >
                      {createMutation.isPending ? (
                        <>
                          <FaSpinner className="animate-spin w-4 h-4" />{" "}
                          Creando...
                        </>
                      ) : (
                        <>
                          Crear Usuario <FaPlus className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* --- LISTA DE USUARIOS (TARJETAS EN MÓVIL / TABLA EN DESKTOP) --- */}
        <motion.div
          className="lg:col-span-2 order-1 lg:order-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {/* Tabs con mejor estilo responsivo */}
          <div className="flex mb-4 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-md border dark:border-gray-700">
            <button
              onClick={() => setActiveTab("operadores")}
              className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base font-medium rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-2 ${
                activeTab === "operadores"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <FaUserCog className="w-4 h-4 md:w-5 md:h-5" />
              <span>
                Operadores{" "}
                <span className="text-[10px] sm:text-xs opacity-70 ml-0.5">
                  {" "}
                  ({operadores?.length || 0})
                </span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab("admins")}
              className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base font-medium rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-2 ${
                activeTab === "admins"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <FaUserShield className="w-4 h-4 md:w-5 md:h-5" />
              <span>
                Administradores{" "}
                <span className="text-[10px] sm:text-xs opacity-70 ml-0.5">
                  {" "}
                  ({admins?.length || 0})
                </span>
              </span>
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 overflow-hidden min-h-[300px] flex flex-col justify-between">
            {/* Manejo de estado de carga y vacío */}
            {isLoading && !usersToShow ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center flex-grow">
                <FaSpinner className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4" />
                Cargando usuarios...
              </div>
            ) : !usersToShow || usersToShow.length === 0 ? (
              <div className="p-8 text-center text-gray-500 italic flex flex-col items-center justify-center flex-grow">
                <FaUsers className="w-12 h-12 text-gray-300 mb-2" />
                No hay usuarios registrados en esta categoría.
              </div>
            ) : (
              <>
                {/* VISTA DESKTOP (Tabla Clásica) - visible desde MD (768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="py-3 px-6 text-left font-bold text-gray-600 dark:text-gray-300 w-20">
                          ID
                        </th>
                        <th className="py-3 px-6 text-left font-bold text-gray-600 dark:text-gray-300">
                          Usuario
                        </th>
                        <th className="py-3 px-6 text-left font-bold text-gray-600 dark:text-gray-300">
                          Rol
                        </th>
                        <th className="py-3 px-6 text-center font-bold text-gray-600 dark:text-gray-300 w-32">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {usersToShow.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <td className="py-3 px-6 text-sm text-gray-500 dark:text-gray-400">
                            #{user.id}
                          </td>
                          <td className="py-3 px-6 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                            {/* Avatar simple basado en iniciales */}
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase text-white shadow-sm ${
                                user.rol === "admin"
                                  ? "bg-purple-500"
                                  : "bg-green-500"
                              }`}
                            >
                              {user.username.slice(0, 2)}
                            </div>
                            {user.username}
                          </td>
                          <td className="py-3 px-6">
                            <span
                              className={`px-3 py-1 text-xs font-bold rounded-full uppercase border ${
                                user.rol === "admin"
                                  ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-800/30 dark:border-purple-700"
                                  : "bg-green-100 text-green-700 border-green-200 dark:bg-green-800/30 dark:border-green-700"
                              }`}
                            >
                              {user.rol}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-center">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => openEditModal(user)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-full transition-colors"
                                title="Editar"
                              >
                                <FaEdit size={18} />
                              </button>
                              <button
                                onClick={() => openDeleteModal(user)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-full transition-colors"
                                title="Eliminar"
                              >
                                <FaTrashAlt size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* VISTA MÓVIL (Tarjetas Modernas) - visible hasta MD (767px) */}
                <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                  {usersToShow.map((user) => (
                    <div
                      key={user.id}
                      className="p-4 flex justify-between items-center bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold uppercase text-white shadow-md ${
                            user.rol === "admin"
                              ? "bg-purple-600"
                              : "bg-green-600"
                          }`}
                        >
                          {user.username.slice(0, 2)}
                        </div>

                        <div>
                          {/* Username y Rol */}
                          <span className="font-bold text-gray-900 dark:text-white text-base block">
                            {user.username}
                          </span>
                          <span
                            className={`text-xs font-bold uppercase ${
                              user.rol === "admin"
                                ? "text-purple-500"
                                : "text-green-500"
                            }`}
                          >
                            {user.rol}{" "}
                            <span className="text-gray-400 font-normal ml-1">
                              #{user.id}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Acciones en Móvil */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg active:scale-95 transition-transform"
                          title="Editar"
                        >
                          <FaEdit size={20} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="p-2 bg-red-50 text-red-600 rounded-lg active:scale-95 transition-transform"
                          title="Eliminar"
                        >
                          <FaTrashAlt size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Modales - Se mantienen igual */}
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
        title="Eliminar Usuario"
        body={`¿Estás seguro de que quieres eliminar a '${selectedUser?.username}'? Esta acción no se puede deshacer.`}
        confirmText="Sí, Eliminar"
        isProcessing={deleteMutation.isPending}
      />
    </motion.div>
  );
};

export default GestionUsuariosPage;
