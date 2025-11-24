import { jwtDecode } from "jwt-decode";
import { useMemo } from "react";
import { Rol, type RolType } from "./../types";

// Actualizamos la interfaz del token
interface DecodedToken {
  id: number;
  rol: RolType; // Usamos el enum Rol
  iat: number;
  exp: number;
}

/**
 * Custom hook para obtener y decodificar el token JWT del localStorage.
 * Proporciona el rol del usuario y si está autenticado.
 */
export const useAuth = () => {
  const token = localStorage.getItem("token");

  // Usamos useMemo para que la decodificación solo ocurra si el token cambia
  const user = useMemo(() => {
    if (token) {
      try {
        const decodedToken: DecodedToken = jwtDecode(token);
        // Validación adicional del rol
        if (!decodedToken || !Object.values(Rol).includes(decodedToken.rol)) {
          console.error("Token con rol inválido:", decodedToken);
          return null;
        }
        return {
          id: decodedToken.id,
          rol: decodedToken.rol,
        };
      } catch (error) {
        console.error("Error al decodificar el token:", error);
        localStorage.removeItem("token"); // Limpiar token inválido
        return null;
      }
    }
    return null;
  }, [token]);

  return {
    isAuthenticated: !!user,
    userRole: user?.rol,
    userId: user?.id,
  };
};
