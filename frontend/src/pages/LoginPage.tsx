// React import removed (not needed in newer JSX runtimes)
import { motion } from "framer-motion";
import LoginForm from "../components/Auth/LoginForm";
import { Toaster } from "react-hot-toast";

const LoginPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-sm w-full"
      >
        <h1 className="text-3xl font-bold text-center text-blue-600 dark:text-blue-400 mb-6">
          Sistema de Trazabilidad
        </h1>
        <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-gray-200 mb-4">
          Iniciar Sesión
        </h2>
        <LoginForm />
      </motion.div>
      <Toaster />
    </div>
  );
};

export default LoginPage;
