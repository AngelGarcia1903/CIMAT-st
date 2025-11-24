import { Request, Response } from "express";
import { prisma } from "../prisma";
import { Prisma, TipoParametro } from "@prisma/client";

// ... (getLineas y getLineaById SIN CAMBIOS) ...
export const getLineas = async (req: Request, res: Response) => {
  try {
    const lineas = await prisma.lineaProduccion.findMany({
      include: {
        lotes: { orderBy: { fecha: "desc" } },
        estaciones: {
          orderBy: { orden: "asc" },
          include: {
            parametros: { orderBy: { id: "asc" } },
          },
        },
      },
      orderBy: { id: "asc" },
    });
    res.status(200).json(lineas);
  } catch (error) {
    console.error("Error al obtener las líneas:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

export const getLineaById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido." });

  try {
    const linea = await prisma.lineaProduccion.findUnique({
      where: { id: id },
      include: {
        estaciones: {
          orderBy: { orden: "asc" },
          include: { parametros: { orderBy: { id: "asc" } } },
        },
      },
    });
    if (!linea)
      return res.status(404).json({ message: "Línea no encontrada." });
    res.status(200).json(linea);
  } catch (error) {
    console.error("Error al obtener línea:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

// ========================================================================
// POST - Crear Línea (V5: Acepta opcuaUrl)
// ========================================================================
export const createLinea = async (req: Request, res: Response) => {
  const { nombre, descripcion, opcuaUrl } = req.body; // <-- RECIBIR URL
  if (!nombre?.trim())
    return res.status(400).json({ message: "Nombre obligatorio." });

  try {
    const nuevaLinea = await prisma.lineaProduccion.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        opcuaUrl: opcuaUrl?.trim() || null, // <-- GUARDAR URL
      },
    });
    res.status(201).json(nuevaLinea);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ message: `Ya existe una línea con el nombre '${nombre}'.` });
    }
    res.status(500).json({ message: "Error interno." });
  }
};

// ... (Funciones Auxiliares y createEstacion... SIN CAMBIOS hasta updateLinea) ...
const validarYLimpiarParametro = (paramData: any): string | null => {
  // ... (Copia la función validarYLimpiarParametro de tu versión anterior V4.1)
  if (!paramData.nombreParametro?.trim())
    return "Nombre parámetro obligatorio.";
  if (!paramData.direccionOpcUa?.trim()) return "Dirección OPC UA obligatoria.";

  switch (paramData.tipo) {
    case TipoParametro.numerico:
      const minVal =
        paramData.valorMin !== null && paramData.valorMin !== ""
          ? Number(paramData.valorMin)
          : null;
      const maxVal =
        paramData.valorMax !== null && paramData.valorMax !== ""
          ? Number(paramData.valorMax)
          : null;
      if (minVal !== null && isNaN(minVal)) return "Valor mínimo inválido.";
      if (maxVal !== null && isNaN(maxVal)) return "Valor máximo inválido.";
      if (minVal !== null && maxVal !== null && minVal > maxVal)
        return "Mínimo no puede ser mayor que Máximo.";
      paramData.valorMin = minVal;
      paramData.valorMax = maxVal;
      paramData.valorBooleanoOK = null;
      break;
    case TipoParametro.booleano:
      if (
        paramData.valorBooleanoOK === "true" ||
        paramData.valorBooleanoOK === true
      )
        paramData.valorBooleanoOK = true;
      else if (
        paramData.valorBooleanoOK === "false" ||
        paramData.valorBooleanoOK === false
      )
        paramData.valorBooleanoOK = false;
      else paramData.valorBooleanoOK = null;
      paramData.valorMin = null;
      paramData.valorMax = null;
      break;
    default:
      paramData.valorMin = null;
      paramData.valorMax = null;
      paramData.valorBooleanoOK = null;
      break;
  }
  return null;
};

export const createEstacion = async (req: Request, res: Response) => {
  // ... (Copia createEstacion de V4.1 - ya lo tienes bien)
  const { nombreEstacion, orden, parametros, triggerNodeId, serieNodeId } =
    req.body;
  const lineaId = parseInt(req.body.lineaId);
  if (isNaN(lineaId))
    return res.status(400).json({ message: "ID línea inválido." });
  if (!nombreEstacion?.trim())
    return res.status(400).json({ message: "Nombre estación obligatorio." });
  if (!Array.isArray(parametros))
    return res.status(400).json({ message: "Parámetros inválidos." });

  try {
    const parametrosLimpios = [];
    for (const p of parametros) {
      const paramToValidate = { ...p };
      const errorMsg = validarYLimpiarParametro(paramToValidate);
      if (errorMsg) return res.status(400).json({ message: errorMsg });
      parametrosLimpios.push({
        nombreParametro: paramToValidate.nombreParametro.trim(),
        tipo: paramToValidate.tipo,
        direccionOpcUa: paramToValidate.direccionOpcUa.trim(),
        valorMin: paramToValidate.valorMin,
        valorMax: paramToValidate.valorMax,
        valorBooleanoOK: paramToValidate.valorBooleanoOK,
      });
    }
    const nuevaEstacion = await prisma.estacion.create({
      data: {
        lineaId,
        nombreEstacion: nombreEstacion.trim(),
        orden: parseInt(orden),
        triggerNodeId: triggerNodeId?.trim() || null,
        serieNodeId: serieNodeId?.trim() || null,
        parametros: { create: parametrosLimpios },
      },
      include: { parametros: true },
    });
    res.status(201).json(nuevaEstacion);
  } catch (error: any) {
    if (error.code === "P2002")
      return res.status(409).json({ message: "Datos duplicados." });
    res.status(500).json({ message: "Error interno." });
  }
};

export const createEstacionConParametro = async (
  req: Request,
  res: Response
) => {
  // ... (Copia createEstacionConParametro de V4.1)
  const { nombreEstacion, orden, parametro, triggerNodeId, serieNodeId } =
    req.body;
  const lineaId = parseInt(req.body.lineaId);
  if (isNaN(lineaId) || !nombreEstacion?.trim() || !parametro)
    return res.status(400).json({ message: "Datos incompletos." });
  const paramToValidate = { ...parametro };
  const errorMsg = validarYLimpiarParametro(paramToValidate);
  if (errorMsg) return res.status(400).json({ message: errorMsg });
  const parametroLimpio = {
    nombreParametro: paramToValidate.nombreParametro.trim(),
    tipo: paramToValidate.tipo,
    direccionOpcUa: paramToValidate.direccionOpcUa.trim(),
    valorMin: paramToValidate.valorMin,
    valorMax: paramToValidate.valorMax,
    valorBooleanoOK: paramToValidate.valorBooleanoOK,
  };
  try {
    const nuevaEstacion = await prisma.estacion.create({
      data: {
        lineaId,
        nombreEstacion: nombreEstacion.trim(),
        orden: parseInt(orden),
        triggerNodeId: triggerNodeId?.trim() || null,
        serieNodeId: serieNodeId?.trim() || null,
        parametros: { create: [parametroLimpio] },
      },
      include: { parametros: true },
    });
    res.status(201).json(nuevaEstacion);
  } catch (error: any) {
    if (error.code === "P2002")
      return res.status(409).json({ message: "Datos duplicados." });
    res.status(500).json({ message: "Error interno." });
  }
};

export const createParametroParaEstacion = async (
  req: Request,
  res: Response
) => {
  // ... (Copia createParametroParaEstacion de V4.1)
  const estacionId = parseInt(req.params.estacionId);
  const parametroData = req.body;
  if (isNaN(estacionId))
    return res.status(400).json({ message: "ID inválido." });
  const paramToValidate = { ...parametroData };
  const errorMsg = validarYLimpiarParametro(paramToValidate);
  if (errorMsg) return res.status(400).json({ message: errorMsg });
  try {
    const nuevoParametro = await prisma.parametro.create({
      data: {
        estacionId,
        nombreParametro: paramToValidate.nombreParametro.trim(),
        tipo: paramToValidate.tipo,
        direccionOpcUa: paramToValidate.direccionOpcUa.trim(),
        valorMin: paramToValidate.valorMin,
        valorMax: paramToValidate.valorMax,
        valorBooleanoOK: paramToValidate.valorBooleanoOK,
      },
    });
    res.status(201).json(nuevoParametro);
  } catch (error: any) {
    if (error.code === "P2002")
      return res.status(409).json({ message: "Dirección OPC UA duplicada." });
    res.status(500).json({ message: "Error servidor." });
  }
};

// ========================================================================
// PUT - Actualizar Línea (V5: Acepta opcuaUrl)
// ========================================================================
export const updateLinea = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { nombre, descripcion, opcuaUrl } = req.body; // <-- RECIBIR URL
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido." });

  try {
    const data: any = {};
    if (nombre) data.nombre = nombre.trim();
    if (descripcion !== undefined)
      data.descripcion = descripcion?.trim() || null;
    if (opcuaUrl !== undefined) data.opcuaUrl = opcuaUrl?.trim() || null; // <-- GUARDAR URL

    const updated = await prisma.lineaProduccion.update({
      where: { id },
      data,
    });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar." });
  }
};

// ... (updateEstacion, updateParametro y deleteResource SIN CAMBIOS - Usa los V4.1) ...
export const updateEstacion = async (req: Request, res: Response) => {
  // ... (Copia updateEstacion de V4.1)
  const id = parseInt(req.params.id);
  const { nombreEstacion, orden, triggerNodeId, serieNodeId } = req.body;
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido." });
  try {
    const data: any = {};
    if (nombreEstacion) data.nombreEstacion = nombreEstacion.trim();
    if (orden) data.orden = parseInt(orden);
    if (triggerNodeId !== undefined)
      data.triggerNodeId = triggerNodeId?.trim() || null;
    if (serieNodeId !== undefined)
      data.serieNodeId = serieNodeId?.trim() || null;

    const updated = await prisma.estacion.update({ where: { id }, data });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar estación." });
  }
};

export const updateParametro = async (req: Request, res: Response) => {
  // ... (Copia updateParametro de V4.1)
  const id = parseInt(req.params.id);
  const newData = req.body;
  if (isNaN(id)) return res.status(400).json({ message: "ID inválido." });
  try {
    const current = await prisma.parametro.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ message: "No encontrado." });
    const merged = { ...current, ...newData };
    const errorMsg = validarYLimpiarParametro(merged);
    if (errorMsg) return res.status(400).json({ message: errorMsg });
    const updated = await prisma.parametro.update({
      where: { id },
      data: {
        nombreParametro: merged.nombreParametro.trim(),
        tipo: merged.tipo,
        direccionOpcUa: merged.direccionOpcUa.trim(),
        valorMin: merged.valorMin,
        valorMax: merged.valorMax,
        valorBooleanoOK: merged.valorBooleanoOK,
      },
    });
    res.status(200).json(updated);
  } catch (error: any) {
    if (error.code === "P2002")
      return res.status(409).json({ message: "Dirección OPC UA duplicada." });
    res.status(500).json({ message: "Error interno." });
  }
};

export const deleteResource = async (req: Request, res: Response) => {
  // ... (Copia deleteResource)
  const { resourceType, id } = req.params;
  const idInt = parseInt(id);
  try {
    if (resourceType === "linea")
      await prisma.lineaProduccion.delete({ where: { id: idInt } });
    else if (resourceType === "estacion")
      await prisma.estacion.delete({ where: { id: idInt } });
    else if (resourceType === "parametro")
      await prisma.parametro.delete({ where: { id: idInt } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar." });
  }
};
