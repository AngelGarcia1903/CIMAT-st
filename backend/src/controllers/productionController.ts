import { Request, Response } from "express";
import { prisma } from "../prisma";
import {
  Prisma,
  EstadoLote,
  ResultadoRegistro,
  TipoParametro,
  EstadoProducto,
} from "@prisma/client"; // Todos los Enums necesarios

// ========================================================================
// POST - Iniciar un nuevo lote de producción
// (Sin cambios)
// ========================================================================
export const iniciarLote = async (req: Request, res: Response) => {
  const lineaId = parseInt(req.body.lineaId);
  if (isNaN(lineaId))
    return res.status(400).json({ message: "ID línea inválido." });

  try {
    const linea = await prisma.lineaProduccion.findUnique({
      where: { id: lineaId },
    });
    if (!linea) return res.status(404).json({ message: "Línea no existe." });

    // Poner lotes activos anteriores como FINALIZADO
    await prisma.lote.updateMany({
      where: { lineaId: lineaId, estado: EstadoLote.ACTIVO },
      data: { estado: EstadoLote.FINALIZADO },
    });

    // Generar nombre de lote único y secuencial para el día
    const today = new Date();
    const dateStr = `${today.getFullYear()}${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${today.getDate().toString().padStart(2, "0")}`;
    // Contar lotes de ESTA línea creados HOY
    const lotesHoy = await prisma.lote.count({
      where: {
        lineaId: lineaId, // Filtrar por línea
        fecha: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999)),
        },
      },
    });
    // Formato: NOMBRE_LINEA-YYYYMMDD-NNN
    const nombreLote = `${linea.nombre
      .toUpperCase()
      .replace(/ /g, "_")}-${dateStr}-${String(lotesHoy + 1).padStart(3, "0")}`;

    // Crear nuevo lote
    const nuevoLote = await prisma.lote.create({
      data: { nombre: nombreLote, lineaId: lineaId, estado: EstadoLote.ACTIVO },
    });
    res.status(201).json(nuevoLote);
  } catch (error) {
    console.error("Error detallado al iniciar el lote:", error);
    res.status(500).json({ message: "Error interno al iniciar lote." });
  }
};

// ========================================================================
// POST - Finalizar el lote activo de una línea de producción
// (Sin cambios)
// ========================================================================
export const finalizarLote = async (req: Request, res: Response) => {
  const lineaId = parseInt(req.body.lineaId);
  if (isNaN(lineaId))
    return res.status(400).json({ message: "ID línea inválido." });

  try {
    const loteActualizado = await prisma.lote.updateMany({
      where: { lineaId: lineaId, estado: EstadoLote.ACTIVO },
      data: { estado: EstadoLote.FINALIZADO },
    });
    if (loteActualizado.count === 0) {
      return res.status(404).json({
        message:
          "No se encontró ningún lote activo para finalizar en esta línea.",
      });
    }
    res.status(200).json({ message: "Lote finalizado con éxito." });
  } catch (error) {
    console.error("Error al finalizar el lote:", error);
    res.status(500).json({ message: "Error interno al finalizar lote." });
  }
};

// ========================================================================
// POST - Registrar Paso de Producción (BLINDADO CONTRA CONCURRENCIA)
// ========================================================================
export const registrarPaso = async (req: Request, res: Response) => {
  const estacionId = parseInt(req.body.estacionId);
  const { numeroSerie, registrosParametros } = req.body;

  // --- 1. Validaciones de Entrada ---
  if (isNaN(estacionId))
    return res.status(400).json({ message: "ID estación inválido." });
  if (!numeroSerie?.trim())
    return res.status(400).json({ message: "Número de serie obligatorio." });
  if (!Array.isArray(registrosParametros) || registrosParametros.length === 0)
    return res.status(400).json({ message: "Faltan datos de parámetros." });

  try {
    // --- 2. Validar Estación y Lote ---
    const estacion = await prisma.estacion.findUnique({
      where: { id: estacionId },
      include: { linea: true },
    });
    if (!estacion)
      return res.status(404).json({ message: "Estación no encontrada." });

    const loteActivo = await prisma.lote.findFirst({
      where: { lineaId: estacion.lineaId, estado: EstadoLote.ACTIVO },
    });
    if (!loteActivo)
      return res.status(400).json({
        message: `No hay lote activo para la línea '${estacion.linea.nombre}'.`,
      });

    // --- 2b. Obtener/Crear Producto (LÓGICA ANTI-COLISIÓN) ---
    let producto;
    try {
      // Intento 1: Upsert normal (Crear o Actualizar)
      producto = await prisma.producto.upsert({
        where: { numeroSerie: numeroSerie.trim() },
        update: { estado: EstadoProducto.EN_PROCESO },
        create: {
          numeroSerie: numeroSerie.trim(),
          loteId: loteActivo.id,
          estado: EstadoProducto.EN_PROCESO,
        },
      });
    } catch (err: any) {
      // Si falla con P2002 (Unique Constraint), significa que otra estación
      // ganó la carrera y creó el producto milisegundos antes.
      if (err.code === "P2002") {
        // Plan B: Buscar el producto que la otra estación ya creó
        producto = await prisma.producto.findUnique({
          where: { numeroSerie: numeroSerie.trim() },
        });
      } else {
        throw err; // Si es otro error, fallar normal
      }
    }

    if (!producto) {
      return res
        .status(500)
        .json({ message: "Error crítico al obtener producto." });
    }
    // --- FIN LÓGICA ANTI-COLISIÓN ---

    // --- 3. Preparar y Validar Registros ---
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = ahora.getMonth() + 1;
    const dia = ahora.getDate();
    let estacionHaFallado = false;
    const registrosParaCrear: Prisma.RegistroCreateManyInput[] = [];

    const parametrosDef = await prisma.parametro.findMany({
      where: { estacionId: estacionId },
    });
    const mapParametros = new Map(parametrosDef.map((p) => [p.id, p]));

    for (const reg of registrosParametros) {
      const parametroId = parseInt(reg.parametroId);
      if (isNaN(parametroId)) continue;

      const parametroDef = mapParametros.get(parametroId);
      if (!parametroDef) {
        console.warn(
          `[registrarPaso] Param ${parametroId} no pertenece a Estación ${estacionId}.`
        );
        continue;
      }

      let resultadoParametro: ResultadoRegistro = ResultadoRegistro.OK;
      const valorReportado = reg.valorReportado?.toString() || "N/A";

      // LÓGICA DE VALIDACIÓN V4.1
      try {
        switch (parametroDef.tipo) {
          case TipoParametro.numerico:
            const valorNum = parseFloat(valorReportado);
            if (
              isNaN(valorNum) ||
              (parametroDef.valorMin != null &&
                valorNum < parametroDef.valorMin.toNumber()) ||
              (parametroDef.valorMax != null &&
                valorNum > parametroDef.valorMax.toNumber())
            ) {
              resultadoParametro = ResultadoRegistro.NO_OK;
            }
            break;

          case TipoParametro.texto:
            if (valorReportado.trim().toLowerCase() !== "ok") {
              resultadoParametro = ResultadoRegistro.NO_OK;
            }
            break;

          case TipoParametro.booleano:
            const valorBoolLeido = valorReportado.toLowerCase() === "true";
            const valorEsperadoOK = parametroDef.valorBooleanoOK;

            if (valorEsperadoOK === null || valorEsperadoOK === undefined) {
              if (valorBoolLeido !== true) {
                resultadoParametro = ResultadoRegistro.NO_OK;
              }
            } else {
              if (valorBoolLeido !== valorEsperadoOK) {
                resultadoParametro = ResultadoRegistro.NO_OK;
              }
            }
            break;
        }
      } catch (e) {
        console.error("Error validando parámetro:", e);
        resultadoParametro = ResultadoRegistro.NO_OK;
      }

      if (resultadoParametro === ResultadoRegistro.NO_OK) {
        estacionHaFallado = true;
      }

      registrosParaCrear.push({
        productoId: producto.id,
        estacionId: estacionId,
        parametroId: parametroId,
        valorReportado: valorReportado,
        resultado: resultadoParametro,
        año: año,
        mes: mes,
        dia: dia,
        fecha: ahora,
      });
    } // Fin del bucle for

    // --- 4. Guardar Registros en BD ---
    if (registrosParaCrear.length > 0) {
      await prisma.registro.createMany({
        data: registrosParaCrear,
        skipDuplicates: true,
      });
    } else {
      return res
        .status(400)
        .json({ message: "No se pudieron procesar los parámetros." });
    }

    // --- 6. Enviar respuesta ---
    res.status(201).json({
      message: `Paso registrado para ${producto.numeroSerie} en ${estacion.nombreEstacion}.`,
      producto: producto,
      estacion: estacion,
      estacionHaFallado: estacionHaFallado,
    });
  } catch (error) {
    console.error("Error registrando paso:", error);
    res.status(500).json({ message: "Error interno al registrar paso." });
  }
};

// ========================================================================
// GET - Obtener TODOS los registros del LOTE ACTIVO de una LÍNEA
// (Sin cambios)
// ========================================================================
export const getRegistrosLoteActivoPorLinea = async (
  req: Request,
  res: Response
) => {
  const lineaId = parseInt(req.params.lineaId);
  if (isNaN(lineaId))
    return res.status(400).json({ message: "ID de línea inválido." });

  try {
    const loteActivo = await prisma.lote.findFirst({
      where: { lineaId: lineaId, estado: EstadoLote.ACTIVO },
      select: { id: true },
    });

    if (!loteActivo) {
      return res.status(200).json([]);
    }

    const registros = await prisma.registro.findMany({
      where: {
        producto: {
          loteId: loteActivo.id,
        },
      },
      include: {
        producto: { select: { id: true, numeroSerie: true, estado: true } },
        estacion: { select: { id: true, nombreEstacion: true, orden: true } },
        parametro: { select: { id: true, nombreParametro: true } },
      },
      orderBy: {
        fecha: "desc",
      },
      take: 500,
    });

    const productosMap = new Map<string, any>();

    for (const reg of registros) {
      const key = reg.producto.numeroSerie;

      if (!productosMap.has(key)) {
        productosMap.set(key, {
          numeroSerie: reg.producto.numeroSerie,
          idProducto: reg.producto.id,
          estado: reg.producto.estado,
          pasadas: {} as Record<string, any>,
          fechaUltimoRegistro: reg.fecha,
        });
      }

      const productoActual = productosMap.get(key);

      if (reg.fecha > productoActual.fechaUltimoRegistro) {
        productoActual.fechaUltimoRegistro = reg.fecha;
        productoActual.estado = reg.producto.estado;
      } else {
        if (
          productoActual.estado === "EN_PROCESO" &&
          (reg.producto.estado === "REPROCESO" ||
            reg.producto.estado === "DESCARTADO")
        ) {
          productoActual.estado = reg.producto.estado;
        }
      }

      const pasadaKey = `${reg.estacionId}-${reg.fecha.toISOString()}`;

      if (!productoActual.pasadas[pasadaKey]) {
        productoActual.pasadas[pasadaKey] = {
          fecha: reg.fecha,
          estacionId: reg.estacionId,
          nombreEstacion: reg.estacion.nombreEstacion,
          orden: reg.estacion.orden,
          parametros: [],
        };
      }

      productoActual.pasadas[pasadaKey].parametros.push({
        parametroId: reg.parametro.id,
        nombre: reg.parametro.nombreParametro,
        valor: reg.valorReportado,
        resultado: reg.resultado,
      });
    }

    const resultadoFinal = Array.from(productosMap.values()).map((prod) => ({
      ...prod,
      pasadas: Object.values(prod.pasadas).sort(
        (a: any, b: any) => b.fecha.getTime() - a.fecha.getTime()
      ),
    }));

    resultadoFinal.sort((a, b) => {
      return b.fechaUltimoRegistro.getTime() - a.fechaUltimoRegistro.getTime();
    });

    res.status(200).json(resultadoFinal);
  } catch (error) {
    console.error("Error al obtener registros del lote activo:", error);
    res.status(500).json({ message: "Error interno servidor." });
  }
};

// ========================================================================
// GET - Obtener la trazabilidad completa de un producto
// (Sin cambios)
// ========================================================================
export const getTrazabilidadProducto = async (req: Request, res: Response) => {
  const { numeroSerie } = req.params;
  const { lineaId } = req.query;

  if (!numeroSerie?.trim())
    return res.status(400).json({ message: "Número de serie requerido." });

  try {
    const producto = await prisma.producto.findFirst({
      where: {
        numeroSerie: numeroSerie.trim(),
        ...(lineaId && {
          lote: {
            lineaId: parseInt(lineaId as string),
          },
        }),
      },
      include: {
        lote: { include: { linea: { select: { nombre: true } } } },
        registros: {
          include: {
            estacion: { select: { nombreEstacion: true, orden: true } },
            parametro: { select: { nombreParametro: true } },
          },
          orderBy: { fecha: "asc" }, // Ordenar por fecha ASCENDENTE
        },
      },
    });

    if (!producto) {
      return res
        .status(404)
        .json({ message: "Producto no encontrado en esta línea." });
    }

    const historialMap = new Map<number, any>();

    for (const reg of producto.registros) {
      const estacionKey = reg.estacionId;
      if (!historialMap.has(estacionKey)) {
        historialMap.set(estacionKey, {
          id: reg.estacionId,
          nombreEstacion: reg.estacion.nombreEstacion,
          orden: reg.estacion.orden,
          pasadas: [],
        });
      }

      let pasadaActual = historialMap
        .get(estacionKey)
        .pasadas.find((p: any) => p.fecha.getTime() === reg.fecha.getTime());

      if (!pasadaActual) {
        pasadaActual = {
          fecha: reg.fecha,
          parametros: [],
        };
        historialMap.get(estacionKey).pasadas.push(pasadaActual);
      }

      pasadaActual.parametros.push({
        nombre: reg.parametro.nombreParametro,
        valor: reg.valorReportado,
        resultado: reg.resultado,
      });
    }

    const estacionesProcesadas = Array.from(historialMap.values()).sort(
      (a: any, b: any) => a.orden - b.orden
    );

    const resultadoFinal = {
      ...producto,
      registros: undefined,
      historialPorEstacion: estacionesProcesadas,
    };

    res.status(200).json(resultadoFinal);
  } catch (error) {
    console.error("Error al obtener la trazabilidad:", error);
    res.status(500).json({ message: "Error interno servidor." });
  }
};
