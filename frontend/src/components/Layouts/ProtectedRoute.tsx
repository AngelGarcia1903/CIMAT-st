import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const token = localStorage.getItem("token");
  // Si el token existe, se permite el acceso a las rutas anidadas
  return token ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
