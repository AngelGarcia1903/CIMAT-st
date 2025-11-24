import { Request, Response } from "express";
import { prisma } from "../prisma";
// --- NUEVO: Importar 'EstadoProducto' ---
import { Prisma, EstadoProducto } from "@prisma/client"; // Importar tipos de Prisma

/**
 * Busca registros de trazabilidad basados en filtros opcionales.
 * Optimizado para usar índices.
 * Lógica CORREGIDA para combinar filtros con AND.
 */
export const buscarRegistros = async (req: Request, res: Response) => {
  // --- NUEVO: Extraer 'estado' del query ---
  const { año, mes, dia, numeroSerie, lineaId, nombreLote, estado } = req.query;

  // Convertir filtros numéricos
  const añoInt = año ? parseInt(año as string) : undefined;
  const mesInt = mes ? parseInt(mes as string) : undefined;
  const diaInt = dia ? parseInt(dia as string) : undefined;
  const lineaIdInt = lineaId ? parseInt(lineaId as string) : undefined;

  // --- Construcción Dinámica de la Cláusula 'where' ---
  const whereClause: Prisma.RegistroWhereInput = {};

  // 1. Añadir filtros de fecha (usarán el índice [año, mes, dia])
  if (añoInt) whereClause.año = añoInt;
  if (mesInt) whereClause.mes = mesInt;
  if (diaInt) whereClause.dia = diaInt;

  // 2. Añadir filtros de Producto/Lote/Línea (se anidan)
  const productoWhere: Prisma.ProductoWhereInput = {};
  const loteWhere: Prisma.LoteWhereInput = {};

  if (numeroSerie) {
    // Si hay N° Serie, se añade al filtro de producto
    productoWhere.numeroSerie = { contains: numeroSerie as string }; // Usamos 'contains' para búsquedas parciales
  }

  // --- NUEVO: Añadir filtro de 'estado' al 'productoWhere' ---
  if (estado && typeof estado === "string" && estado !== "todos") {
    // Validamos que el estado sea uno de los valores permitidos del Enum
    if (Object.values(EstadoProducto).includes(estado as EstadoProducto)) {
      productoWhere.estado = estado as EstadoProducto;
    } else {
      // Si el estado no es válido, detenemos la consulta.
      return res.status(400).json({ message: `Estado '${estado}' no válido.` });
    }
  }
  // --- FIN NUEVO ---

  if (lineaIdInt) {
    // Si hay ID de Línea, se añade al filtro de lote
    loteWhere.lineaId = lineaIdInt;
  }

  if (nombreLote) {
    // Si hay Nombre de Lote, se añade al filtro de lote
    loteWhere.nombre = { contains: nombreLote as string };
  }

  // 3. Ensamblar los filtros anidados
  // Si hay condiciones en loteWhere, se añaden a productoWhere
  if (Object.keys(loteWhere).length > 0) {
    productoWhere.lote = loteWhere;
  }
  // Si hay condiciones en productoWhere (ahora incluye N° Serie Y Estado),
  // se añaden a la consulta principal
  if (Object.keys(productoWhere).length > 0) {
    whereClause.producto = productoWhere;
  }
  // --- Fin Construcción Dinámica ---

  // Validar que al menos un filtro esté presente
  if (Object.keys(whereClause).length === 0) {
    return res
      .status(400)
      .json({ message: "Se requiere al menos un filtro de búsqueda." });
  }

  try {
    const registros = await prisma.registro.findMany({
      where: whereClause,
      include: {
        // Incluir toda la jerarquía necesaria para la tabla de resultados
        producto: {
          include: {
            lote: {
              include: {
                linea: { select: { nombre: true } }, // Incluir nombre de línea
              },
            },
          },
        },
        estacion: { select: { nombreEstacion: true } },
        parametro: { select: { nombreParametro: true } },
      },
      orderBy: {
        fecha: "desc", // Ordenar por los más recientes primero
      },
      take: 200, // Limitar resultados a 200 para no sobrecargar
    });

    if (registros.length === 0) {
      return res.status(404).json({
        message: "No se encontraron registros con los filtros aplicados.",
      });
    }

    res.status(200).json(registros);
  } catch (error) {
    console.error("Error al buscar registros de trazabilidad:", error);
    res
      .status(500)
      .json({ message: "Error en el servidor al realizar la búsqueda." });
  }
};

// ========================================================================
// GET - Obtener Fechas Disponibles (Años/Meses)
// (Esta función no necesita cambios)
// ========================================================================
export const getFechasDisponibles = async (req: Request, res: Response) => {
  try {
    // Consultar la base de datos por combinaciones únicas de año y mes
    const fechas = await prisma.registro.findMany({
      select: {
        año: true,
        mes: true,
      },
      distinct: ["año", "mes"], // ¡La clave! Obtiene solo combinaciones únicas
      orderBy: [{ año: "desc" }, { mes: "asc" }],
    });

    // Agrupar los meses por año
    const fechasAgrupadas = fechas.reduce(
      (acc, { año, mes }) => {
        if (!acc[año]) {
          acc[año] = []; // Si el año no existe en el acumulador, crearlo
        }
        acc[año].push(mes); // Añadir el mes a ese año
        return acc;
      },
      {} as Record<number, number[]>
    ); // { 2025: [10, 11, 12], 2024: [1, 2, ...] }

    res.status(200).json(fechasAgrupadas);
  } catch (error) {
    console.error("Error al obtener fechas disponibles:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

// ========================================================================
// GET - Obtener Historial de Fallas de un Producto (Para el Modal)
// ========================================================================
export const getFallasPorProducto = async (req: Request, res: Response) => {
  const productoId = parseInt(req.params.productoId);
  if (isNaN(productoId))
    return res.status(400).json({ message: "ID de producto inválido." });

  try {
    const fallas = await prisma.registro.findMany({
      where: {
        productoId: productoId,
        resultado: "NO_OK", // <--- EL FILTRO CLAVE
      },
      include: {
        estacion: { select: { nombreEstacion: true } },
        parametro: {
          select: {
            nombreParametro: true,
            valorMin: true,
            valorMax: true,
            valorBooleanoOK: true,
          },
        },
      },
      orderBy: {
        fecha: "desc",
      },
    });

    res.status(200).json(fallas);
  } catch (error) {
    console.error("Error al obtener fallas:", error);
    res
      .status(500)
      .json({ message: "Error al obtener el historial de fallas." });
  }
};
