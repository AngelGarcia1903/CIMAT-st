// Define roles matching the backend Prisma schema using 'as const'
// This provides type safety similar to an enum but uses pure JS syntax,
// avoiding potential issues with TypeScript build configurations like TS1294.
export const Rol = {
  superadmin: "superadmin",
  admin: "admin",
  operador: "operador",
} as const;

// Create a union type from the object values for robust type checking.
// This type represents the allowed string literals for roles.
export type RolType = (typeof Rol)[keyof typeof Rol];

/**
 * Helper type guard function to check if a string is a valid RolType.
 * Useful for validating data coming from APIs or localStorage.
 *
 * @param value The value to check.
 * @returns True if the value is a valid RolType, false otherwise.
 */
export function isValidRol(value: any): value is RolType {
  return (
    typeof value === "string" &&
    (value === Rol.superadmin || value === Rol.admin || value === Rol.operador)
  );
}

// Define types for production data used across components
export interface ProductionLineSummary {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activeLote?: string | null; // Name of the active lot
}

export interface StationBasicInfo {
  id: number;
  nombreEstacion: string;
  orden: number;
}

export interface ParameterDefinition {
  id: number;
  nombreParametro: string;
  tipo: "numerico" | "texto" | "booleano";
  direccionOpcUa: string;
  valorMin?: number | null;
  valorMax?: number | null;
  opciones?: string | null;
}
