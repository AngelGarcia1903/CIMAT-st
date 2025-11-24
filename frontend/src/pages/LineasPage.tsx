import React from "react";
import LineasTree from "../components/Lineas/LineasTree";
//  1. IMPORTAR EL HOOK 'useOutletContext'
import { useOutletContext } from "react-router-dom";
//  2. CORRECCIÓN: Se añade 'import type' para cumplir con ts(1484)
import type { LineasTreeContextType } from "../components/Layouts/MainLayout";

const LineasPage: React.FC = () => {
  //  3. RECIBIR LAS FUNCIONES DESDE EL CONTEXTO DEL 'OUTLET'
  const { onDeleteItem, onEditItem, onAddParam } =
    useOutletContext<LineasTreeContextType>();

  return (
    // Contenedor para centrar y estilizar la página
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/*  4. PASAR LAS FUNCIONES RECIBIDAS COMO PROPS A LINEASTREE */}
      <LineasTree
        isCollapsed={false}
        contexto="pagina"
        onDeleteItem={onDeleteItem}
        onEditItem={onEditItem}
        onAddParam={onAddParam}
      />
    </div>
  );
};

export default LineasPage;
