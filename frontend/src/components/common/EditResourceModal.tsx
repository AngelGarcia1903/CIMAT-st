import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import toast from "react-hot-toast";

// --- Interfaz de Props ---
interface EditResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: any; // Datos actuales
  resourceType: "linea" | "estacion" | "parametro";
  resourceId: number;
  onSave: (
    resourceId: number,
    resourceType: "linea" | "estacion" | "parametro",
    data: any
  ) => void;
  isProcessing: boolean;
  title?: string;
  confirmText?: string;
}

const EditResourceModal: React.FC<EditResourceModalProps> = ({
  isOpen,
  onClose,
  resource,
  resourceType,
  resourceId,
  onSave,
  isProcessing,
  title,
  confirmText = "Guardar Cambios",
}) => {
  const [formData, setFormData] = useState<any>({});

  // --- Efecto de Inicialización ---
  useEffect(() => {
    if (resource && isOpen) {
      const initialData = { ...resource };

      // Lógica específica por tipo para asegurar campos
      if (resourceType === "linea") {
        // V5: Asegurar que opcuaUrl exista en el estado
        initialData.opcuaUrl = initialData.opcuaUrl ?? "";
      } else if (resourceType === "estacion") {
        // V4: Asegurar campos de triggers
        initialData.triggerNodeId = initialData.triggerNodeId ?? "";
        initialData.serieNodeId = initialData.serieNodeId ?? "";
      } else if (resourceType === "parametro") {
        // Conversión numérica para inputs (manejo de null)
        initialData.valorMin =
          initialData.valorMin != null ? Number(initialData.valorMin) : null;
        initialData.valorMax =
          initialData.valorMax != null ? Number(initialData.valorMax) : null;
        // V4.1: Asegurar booleano
        initialData.valorBooleanoOK = initialData.valorBooleanoOK ?? null;
      }
      setFormData(initialData);
    }
  }, [resource, isOpen, resourceType]);

  // --- Manejador de Cambios ---
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement;

    let processedValue: any = value;

    // 1. Conversión numérica para orden y min/max
    if (name === "orden" || name === "valorMin" || name === "valorMax") {
      processedValue = value === "" ? null : parseFloat(value);
      // Validación básica (opcional, toast ya avisa)
      if (value !== "" && isNaN(processedValue)) {
        // Podríamos revertir aquí, pero dejamos que el usuario corrija
      }
    }

    // 2. Conversión especial para el select de booleano (V4.1)
    // El select devuelve strings "true"/"false", necesitamos booleanos reales
    if (name === "valorBooleanoOK") {
      if (value === "true") processedValue = true;
      else if (value === "false") processedValue = false;
      else processedValue = null; // Caso default/vacío
    }

    let updatedData = { ...formData, [name]: processedValue };

    // 3. Limpieza automática en tiempo real si cambia el tipo de parámetro
    if (resourceType === "parametro" && name === "tipo") {
      if (value !== "numerico") {
        updatedData.valorMin = null;
        updatedData.valorMax = null;
      }
      if (value !== "booleano") {
        updatedData.valorBooleanoOK = null;
      }
    }

    setFormData(updatedData);
  };

  // --- Manejador de Guardado ---
  const handleSave = () => {
    // 1. Validaciones Básicas
    if (resourceType === "linea" && !formData.nombre?.trim()) {
      toast.error("El nombre de la línea es obligatorio.");
      return;
    }
    if (resourceType === "estacion" && !formData.nombreEstacion?.trim()) {
      toast.error("El nombre de la estación es obligatorio.");
      return;
    }
    if (
      resourceType === "parametro" &&
      (!formData.nombreParametro?.trim() || !formData.direccionOpcUa?.trim())
    ) {
      toast.error("Nombre y Dirección OPC son obligatorios.");
      return;
    }

    // 2. Validación de Rangos Numéricos
    if (resourceType === "parametro" && formData.tipo === "numerico") {
      const min = formData.valorMin;
      const max = formData.valorMax;
      if (min !== null && max !== null && min > max) {
        toast.error("El valor mínimo no puede ser mayor que el máximo.");
        return;
      }
    }

    // 3. Limpieza Final de Datos (Antes de enviar al backend)
    // Esto asegura que no enviemos basura (ej. triggerNodeId en un parámetro)

    // CASO LÍNEA
    if (resourceType === "linea") {
      formData.opcuaUrl = formData.opcuaUrl?.trim() || null; // V5
    } else {
      delete formData.opcuaUrl;
    }

    // CASO ESTACIÓN
    if (resourceType === "estacion") {
      formData.triggerNodeId = formData.triggerNodeId?.trim() || null; // V4
      formData.serieNodeId = formData.serieNodeId?.trim() || null; // V4
    } else {
      delete formData.triggerNodeId;
      delete formData.serieNodeId;
    }

    // CASO PARÁMETRO
    if (resourceType === "parametro") {
      if (formData.tipo !== "numerico") {
        formData.valorMin = null;
        formData.valorMax = null;
      }
      if (formData.tipo !== "booleano") {
        formData.valorBooleanoOK = null; // V4.1
      }
    } else {
      delete formData.nombreParametro;
      delete formData.direccionOpcUa;
      delete formData.tipo;
      delete formData.valorMin;
      delete formData.valorMax;
      delete formData.valorBooleanoOK;
    }

    // Eliminar campos obsoletos si existieran
    const { opciones, opcionCorrecta, ...dataToSave } = formData;

    onSave(resourceId, resourceType, dataToSave);
  };

  // --- Renderizado del Formulario ---
  const renderFormFields = () => {
    switch (resourceType) {
      case "linea":
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nombre Línea
              </label>
              <input
                type="text"
                name="nombre"
                maxLength={50}
                value={formData.nombre || ""}
                onChange={handleChange}
                required
                className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* --- V5: Campo URL --- */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                URL Servidor OPC UA (Opcional)
              </label>
              <input
                type="text"
                name="opcuaUrl"
                value={formData.opcuaUrl || ""}
                onChange={handleChange}
                placeholder="opc.tcp://IP:PUERTO"
                className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
            {/* ------------------- */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Descripción
              </label>
              <textarea
                name="descripcion"
                maxLength={255}
                value={formData.descripcion || ""}
                onChange={handleChange}
                className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </>
        );

      case "estacion":
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nombre Estación
              </label>
              <input
                type="text"
                name="nombreEstacion"
                maxLength={50}
                value={formData.nombreEstacion || ""}
                onChange={handleChange}
                required
                className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Orden
              </label>
              <input
                type="number"
                name="orden"
                value={formData.orden ?? ""}
                onChange={handleChange}
                required
                min="1"
                className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* --- V4: Campos Trigger/Serie --- */}
            <div className="pt-2 border-t dark:border-gray-600 mt-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Dirección OPC UA del Disparador
              </label>
              <input
                type="text"
                name="triggerNodeId"
                maxLength={100}
                value={formData.triggerNodeId || ""}
                onChange={handleChange}
                placeholder="Ej: ns=1;s=Estacion1.Disparador"
                className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Dirección OPC UA del N° Serie
              </label>
              <input
                type="text"
                name="serieNodeId"
                maxLength={100}
                value={formData.serieNodeId || ""}
                onChange={handleChange}
                placeholder="Ej: ns=1;s=Estacion1.NumeroSerie"
                className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
            {/* ------------------------------- */}
          </>
        );

      case "parametro":
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nombre Parámetro
              </label>
              <input
                type="text"
                maxLength={50}
                name="nombreParametro"
                value={formData.nombreParametro || ""}
                onChange={handleChange}
                required
                className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Dirección OPC UA
              </label>
              <input
                type="text"
                maxLength={100}
                name="direccionOpcUa"
                value={formData.direccionOpcUa || ""}
                onChange={handleChange}
                required
                className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo
              </label>
              <select
                name="tipo"
                value={formData.tipo || "numerico"}
                onChange={handleChange}
                className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
              >
                <option value="numerico">Numérico</option>
                <option value="texto">Texto</option>
                <option value="booleano">Booleano</option>
              </select>
            </div>

            {/* Campos condicionales */}
            {formData.tipo === "numerico" && (
              <div className="flex flex-col md:flex-row md:space-x-2">
                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Valor Mín
                  </label>
                  <input
                    type="number"
                    step="any"
                    maxLength={25}
                    name="valorMin"
                    value={formData.valorMin ?? ""}
                    onChange={handleChange}
                    placeholder="Opcional"
                    className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="w-full md:w-1/2 mt-2 md:mt-0">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Valor Máx
                  </label>
                  <input
                    type="number"
                    maxLength={25}
                    step="any"
                    name="valorMax"
                    value={formData.valorMax ?? ""}
                    onChange={handleChange}
                    placeholder="Opcional"
                    className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* --- V4.1: Campo Booleano --- */}
            {formData.tipo === "booleano" && (
              <div className="flex flex-col space-y-1 pt-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Criterio de Éxito (OK)
                </label>
                <select
                  name="valorBooleanoOK"
                  value={
                    formData.valorBooleanoOK === null
                      ? ""
                      : formData.valorBooleanoOK
                      ? "true"
                      : "false"
                  }
                  onChange={handleChange}
                  className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">(Asumir 'true' es OK)</option>
                  <option value="true">El valor DEBE ser 'true'</option>
                  <option value="false">El valor DEBE ser 'false'</option>
                </select>
              </div>
            )}
            {/* --- FIN V4.1 --- */}
          </>
        );

      default:
        console.error("Tipo de recurso inesperado:", resourceType);
        return (
          <p className="text-red-500">Error: Tipo de recurso no válido.</p>
        );
    }
  };

  const displayTitle =
    title ||
    `Editar ${
      resourceType
        ? resourceType.charAt(0).toUpperCase() + resourceType.slice(1)
        : "Elemento"
    }`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleSave}
      title={displayTitle}
      confirmText={confirmText}
      isProcessing={isProcessing}
    >
      <div className="space-y-4">{renderFormFields()}</div>
    </Modal>
  );
};

export default EditResourceModal;
