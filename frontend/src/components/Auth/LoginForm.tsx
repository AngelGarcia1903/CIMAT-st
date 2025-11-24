import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { loginUser } from "../../services/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      // Guardar token y redirigir
      localStorage.setItem("token", data.token);
      toast.success("Inicio de sesión exitoso!");
      navigate("/home"); // Redirige al dashboard
    },
    onError: (error: any) => {
      // 1. Mostrar mensaje específico de credenciales incorrectas.
      // 2. Aumentar la duración para que sea visible.
      // 3. Usar el mensaje de error del backend si está disponible, si no, uno genérico.
      const errorMessage =
        error.response?.data?.message ||
        "Credenciales incorrectas. Intenta de nuevo.";
      toast.error(errorMessage, {
        duration: 4000, // Mostrar por 4 segundos
      });
      console.error("Error de login:", error.response?.data || error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ username, password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="username"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Usuario
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full mt-1 p-2 border border-gray-300 rounded-md text-gray-900 dark:text-white 
                    dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 maxLength={50}"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mt-1 p-2 border border-gray-300 rounded-md text-gray-900 dark:text-white 
                     dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 maxLength={50}"
        />
      </div>
      <motion.button
        type="submit"
        disabled={mutation.isPending}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-2 px-4 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
      >
        {mutation.isPending ? "Ingresando..." : "Entrar"}
      </motion.button>
    </form>
  );
};

export default LoginForm;
