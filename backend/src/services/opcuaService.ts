import {
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  AttributeIds,
  ClientSubscription,
  TimestampsToReturn,
  DataValue,
  ClientMonitoredItem,
  Variant,
  DataType,
  ClientSession,
} from "node-opcua";
import { prisma } from "../prisma";
import { registrarPaso } from "../controllers/productionController";
import { EstadoProducto, ResultadoRegistro, Parametro } from "@prisma/client";

// ==========================================
// CONFIGURACIÓN DE CONEXIÓN (MODIFICADO V5)
// ==========================================
// IMPORTANTE: maxRetry en 0. Si falla (Simulador apagado), queremos que falle RÁPIDO
// para que el bucle de "sincronizarConexiones" lo vuelva a intentar en 5 segundos.
const connectionStrategy = {
  initialDelay: 1000,
  maxRetry: 0,
  maxDelay: 2000,
};

// Mapa para guardar las sesiones activas
// Clave: URL del servidor (ej. "opc.tcp://localhost:4840")
// Valor: La sesión OPC UA activa
const activeSessions = new Map<
  string,
  { session: ClientSession; client: OPCUAClient }
>();

// Control para evitar superposición de ciclos
let isScanning = false;

/**
 * Función principal de inicialización (MODIFICADO)
 * Ahora inicia el ciclo de vida continuo (Polling)
 */
export const initializeOPCUA = () => {
  console.log(
    "[OPC UA] Inicializando Servicio de Monitoreo Continuo (Hot-Plug)..."
  );

  // Ejecutar inmediatamente la primera vez
  sincronizarConexiones();

  // Configurar el ciclo infinito cada 5 segundos
  setInterval(() => {
    sincronizarConexiones();
  }, 5000);
};

/**
 * CICLO PRINCIPAL: Compara la BD con las conexiones activas
 */
async function sincronizarConexiones() {
  if (isScanning) return; // Si el ciclo anterior no ha terminado, saltamos este
  isScanning = true;

  try {
    // 1. Obtener SÓLO las líneas que tienen Lotes ACTIVOS
    // (Si no hay lote activo, no nos interesa conectar)
    const lineasActivas = await prisma.lineaProduccion.findMany({
      where: {
        opcuaUrl: { not: null },
        lotes: {
          some: { estado: "ACTIVO" },
        },
      },
      include: {
        estaciones: {
          include: { parametros: true },
        },
      },
    });

    // Extraer las URLs únicas que DEBERÍAN estar conectadas
    const urlsNecesarias = new Set(lineasActivas.map((l) => l.opcuaUrl!));

    // 2. LIMPIEZA (Disconnect): Desconectar lo que ya no se necesita
    // (Ej. Se terminó el lote o se borró la línea)
    for (const [url, connection] of activeSessions) {
      if (!urlsNecesarias.has(url)) {
        console.log(
          `[OPC UA] Cerrando conexión a ${url} (Sin lotes activos)...`
        );
        try {
          // Intentamos cerrar ordenadamente
          await connection.session.close();
          await connection.client.disconnect();
        } catch (e) {
          // Ignorar errores al cerrar (puede que ya estuviera caído)
        }
        activeSessions.delete(url);
        console.log(`[OPC UA] Servidor ${url} desconectado.`);
      }
    }

    // 3. CONEXIÓN (Connect): Conectar lo que falta
    // Agrupar líneas por URL para instanciar clientes
    const lineasPorServidor: Record<string, typeof lineasActivas> = {};
    for (const linea of lineasActivas) {
      if (!linea.opcuaUrl) continue;
      if (!lineasPorServidor[linea.opcuaUrl])
        lineasPorServidor[linea.opcuaUrl] = [];
      lineasPorServidor[linea.opcuaUrl].push(linea);
    }

    for (const [url, lineas] of Object.entries(lineasPorServidor)) {
      // Si ya tenemos sesión activa para esta URL, verificamos que siga saludable (opcional)
      // y pasamos al siguiente.
      if (activeSessions.has(url)) {
        // Aquí podrías agregar lógica para ver si la sesión sigue viva,
        // por ahora asumimos que si está en el mapa, está bien.
        continue;
      }

      // Si no existe, intentamos conectar
      console.log(`[OPC UA] Intento de conexión autodetectado: ${url}`);
      await conectarServidorYMonitorearLineas(url, lineas);
    }
  } catch (err: any) {
    console.error("[OPC UA] Error en ciclo de sincronización:", err.message);
  } finally {
    isScanning = false;
  }
}

/**
 * Conecta a UN servidor específico y configura el monitoreo
 */
async function conectarServidorYMonitorearLineas(url: string, lineas: any[]) {
  const client = OPCUAClient.create({
    applicationName: "Cliente-Trazabilidad-Multi",
    connectionStrategy: connectionStrategy,
    securityMode: MessageSecurityMode.None,
    securityPolicy: SecurityPolicy.None,
    endpointMustExist: false,
  });

  try {
    await client.connect(url);
    const session = await client.createSession();
    console.log(`[OPC UA] ✅ Conexión Exitosa con ${url}`);

    // Guardar sesión y cliente para poder cerrarlos después
    activeSessions.set(url, { session, client });

    // Crear suscripción
    const subscription = ClientSubscription.create(session, {
      requestedPublishingInterval: 1000,
      requestedLifetimeCount: 100,
      requestedMaxKeepAliveCount: 10,
      maxNotificationsPerPublish: 100,
      publishingEnabled: true,
      priority: 10,
    });

    // Manejo de eventos de suscripción (opcional, para debug)
    subscription.on("terminated", () => {
      console.warn(
        `[OPC UA] Suscripción terminada en ${url}. Eliminando de activos...`
      );
      activeSessions.delete(url); // Esto forzará reconexión en el siguiente ciclo
    });

    // Configurar monitores
    for (const linea of lineas) {
      console.log(`[OPC UA] Configurando línea: ${linea.nombre}`);
      for (const estacion of linea.estaciones) {
        if (
          estacion.triggerNodeId &&
          estacion.serieNodeId &&
          estacion.parametros.length > 0
        ) {
          setupStationMonitoring(
            session,
            subscription,
            estacion.id,
            estacion.triggerNodeId,
            estacion.serieNodeId,
            estacion.parametros
          );
        }
      }
    }
  } catch (error: any) {
    // IMPORTANTE: Captura silenciosa.
    // Si el simulador está apagado, entra aquí.
    // No hacemos nada, solo logueamos. El setInterval lo volverá a intentar en 5s.
    console.warn(
      `[OPC UA] ⚠️ No se pudo conectar a ${url} (¿Offline?). Reintentando en breve...`
    );
    // Aseguramos desconexión si quedó a medias
    try {
      await client.disconnect();
    } catch (e) {}
  }
}

/**
 * Función auxiliar que crea un monitor OPC UA (LÓGICA ORIGINAL CONSERVADA)
 */
function setupStationMonitoring(
  session: ClientSession,
  subscription: ClientSubscription,
  estacionId: number,
  triggerNodeId: string,
  serieNodeId: string,
  parametrosDeEstaEstacion: Parametro[]
) {
  let isProcessing = false;

  const monitoredItem = ClientMonitoredItem.create(
    subscription,
    { nodeId: triggerNodeId, attributeId: AttributeIds.Value },
    { samplingInterval: 100, discardOldest: true, queueSize: 10 },
    TimestampsToReturn.Both
  );

  monitoredItem.on("changed", async (dataValue: DataValue) => {
    if (
      dataValue.value.dataType === DataType.Boolean &&
      dataValue.value.value === true &&
      !isProcessing
    ) {
      isProcessing = true;
      console.log(`[OPC UA] ¡DISPARADOR ${triggerNodeId} DETECTADO!`);

      let responsePayload: any = {};

      try {
        // Leer N° Serie
        const serieDataValue = await session.read({
          nodeId: serieNodeId,
          attributeId: AttributeIds.Value,
        });
        const numeroSerie = serieDataValue.value.value;

        if (!numeroSerie || numeroSerie === "(vacio)") {
          isProcessing = false;
          return;
        }

        // Leer Parámetros
        const registrosParametros: {
          parametroId: number;
          valorReportado: string;
        }[] = [];

        for (const param of parametrosDeEstaEstacion) {
          const paramDataValue = await session.read({
            nodeId: param.direccionOpcUa,
            attributeId: AttributeIds.Value,
          });
          const valorLeido = paramDataValue?.value?.value;
          const valorReportado =
            valorLeido !== null && valorLeido !== undefined
              ? valorLeido.toString()
              : "N/A";

          registrosParametros.push({
            parametroId: param.id,
            valorReportado: valorReportado,
          });
        }

        console.log(
          `[OPC UA] Registrando ${registrosParametros.length} parámetros para Estación ID ${estacionId} (Serie: ${numeroSerie})`
        );

        // Llamar al controlador (Tonto)
        const mockRequest = {
          body: {
            numeroSerie: numeroSerie,
            estacionId: estacionId,
            registrosParametros: registrosParametros,
          },
        } as any;

        const mockResponse = {
          status: (code: number) => ({
            json: (payload: any) => {
              responsePayload = payload;
              if (code >= 400) console.error(`Error: ${payload.message}`);
            },
          }),
        } as any;

        await registrarPaso(mockRequest, mockResponse);

        // Resetear disparador (Buena práctica)
        await session.write({
          nodeId: triggerNodeId,
          attributeId: AttributeIds.Value,
          value: { value: { dataType: DataType.Boolean, value: false } },
        });
      } catch (err: any) {
        console.error(`[OPC UA] Error en estación ${estacionId}:`, err.message);
      } finally {
        isProcessing = false;
      }
    } else if (dataValue.value.value === false) {
      isProcessing = false;
    }
  });
}
