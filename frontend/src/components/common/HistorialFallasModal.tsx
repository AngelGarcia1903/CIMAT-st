import React from "react";
import { useQuery } from "@tanstack/react-query";
import Modal from "./Modal"; // Tu modal genérico existente
import { getFallasProducto } from "../../services/api";
import { FaExclamationTriangle, FaSpinner } from "react-icons/fa";

interface HistorialFallasModalProps {
  isOpen: boolean;
  onClose: () => void;
  productoId: number | null;
  numeroSerie: string;
}

const HistorialFallasModal: React.FC<HistorialFallasModalProps> = ({
  isOpen,
  onClose,
  productoId,
  numeroSerie,
}) => {
  const {
    data: fallas,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["fallasProducto", productoId],
    queryFn: () => getFallasProducto(productoId!),
    enabled: isOpen && !!productoId, // Solo busca si el modal está abierto
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial de Fallas: ${numeroSerie}`}
      confirmText="Cerrar"
      onConfirm={onClose} // Botón de aceptar cierra el modal
    >
      <div className="space-y-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-700 flex items-start">
          <FaExclamationTriangle className="text-yellow-500 mt-1 mr-3 flex-shrink-0" />
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Este listado muestra los intentos fallidos y las razones por las
            cuales el producto fue marcado para reproceso o descarte.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <FaSpinner className="animate-spin text-blue-500 text-2xl mx-auto" />
            <p className="text-gray-500 mt-2">Cargando historial...</p>
          </div>
        ) : isError ? (
          <div className="text-center py-8 text-red-500">
            Error al cargar el historial de fallas.
          </div>
        ) : !fallas || fallas.length === 0 ? (
          <div className="text-center py-8 text-gray-500 italic">
            No se encontraron registros de fallas históricas.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto border rounded-lg dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Estación
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Parámetro
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Valor
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Causa
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {fallas.map((falla: any) => (
                  <tr key={falla.id}>
                    <td className="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(falla.fecha).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                      {falla.estacion.nombreEstacion}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                      {falla.parametro.nombreParametro}
                    </td>
                    <td className="px-4 py-2 text-sm font-mono text-red-600 font-bold">
                      {falla.valorReportado}
                    </td>
                    <td className="px-4 py-2 text-xs text-red-500 font-medium">
                      Fuera de rango
                      {/* Aquí podrías poner lógica más compleja: "Min: X, Max: Y" usando falla.parametro.valorMin */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default HistorialFallasModal;
