import {
  OPCUAServer,
  Variant,
  DataType,
  StatusCodes,
  AddressSpace,
  UAVariable,
  ServerSession,
} from "node-opcua";
import os from "os";

// --- Variables Globales de Simulación ---
const TaktTime = 10000; // 10 segundos por ciclo
let slotsEstacion: string[] = ["(vacio)", "(vacio)", "(vacio)"];
// [0] = Estación 1, [1] = Estación 2, [2] = Estación 3

// --- Estación 1 (Valores en Memoria) ---
let s1_torque = 6.5;
let s1_inspeccion = "OK";
let s1_sello = true;

// --- Estación 2 (Valores en Memoria) ---
let s2_balanceo = 0.3;
let s2_holgura = 0.03;
let s2_seguro = true;

// --- Estación 3 (Valores en Memoria) ---
let s3_presion = 1.7;
let s3_fuga = false;
let s3_inspeccion = "OK";

/**
 * Función auxiliar para simular un valor con fallo aleatorio.
 */
function getSimulatedValue(
  min: number,
  max: number,
  currentValue: number,
  failureRate: number,
  failureValue: number
): number {
  if (Math.random() < failureRate) {
    return failureValue; // ¡Fallo!
  }
  const variacion = (Math.random() - 0.5) * (max - min) * 0.1;
  return parseFloat(
    Math.max(min, Math.min(max, currentValue + variacion)).toFixed(2)
  );
}

/**
 * Función auxiliar para simular un valor de Texto/Booleano con fallo aleatorio.
 */
function getSimulatedSelection<T>(
  passValue: T,
  failValue: T,
  failureRate: number
): T {
  return Math.random() < failureRate ? failValue : passValue;
}

/**
 * Esta función construye el AddressSpace (la estructura de tags del PLC).
 */
function construirAddressSpace(server: OPCUAServer) {
  const addressSpace = server.engine.addressSpace;
  if (!addressSpace) {
    throw new Error("AddressSpace no inicializado.");
  }

  const namespace = addressSpace.getOwnNamespace();

  // 1. Objeto Principal (Organizador)
  const bomba = namespace.addObject({
    organizedBy: addressSpace.rootFolder.objects,
    browseName: "BombaAgua",
    nodeId: "ns=1;s=BOMBA",
  });

  // ==========================================================
  // --- Estación 1: Ensamblaje Carcasa (MAPEO CORREGIDO) ---
  // ==========================================================
  const estacion1 = namespace.addObject({
    componentOf: bomba,
    browseName: "Estacion1_Ensamblaje",
  });

  // --- Tags Específicos de Estación 1 ---
  namespace.addVariable({
    componentOf: estacion1,
    browseName: "NumeroSerie",
    nodeId: "ns=1;s=Estacion1.NumeroSerie", // <-- CORREGIDO
    dataType: DataType.String,
    value: new Variant({ dataType: DataType.String, value: slotsEstacion[0] }),
  });
  namespace.addVariable({
    componentOf: estacion1,
    browseName: "Disparador",
    nodeId: "ns=1;s=Estacion1.Disparador", // <-- CORREGIDO
    dataType: DataType.Boolean,
    value: new Variant({ dataType: DataType.Boolean, value: false }),
  });

  // --- Parámetros de Proceso E1 ---
  namespace.addVariable({
    componentOf: estacion1,
    browseName: "Torque",
    nodeId: "ns=1;s=Estacion1.Torque", // (Este ya estaba bien)
    dataType: DataType.Double,
    minimumSamplingInterval: 1000,
    value: {
      get: () => {
        s1_torque = getSimulatedValue(5.0, 8.0, s1_torque, 0.05, 8.1);
        return new Variant({ dataType: DataType.Double, value: s1_torque });
      },
    },
  });
  namespace.addVariable({
    componentOf: estacion1,
    browseName: "Inspeccion",
    nodeId: "ns=1;s=Estacion1.Inspeccion", // (Este ya estaba bien)
    dataType: DataType.String,
    minimumSamplingInterval: 1000,
    value: {
      get: () => {
        s1_inspeccion = getSimulatedSelection("OK", "NO OK", 0.15);
        return new Variant({ dataType: DataType.String, value: s1_inspeccion });
      },
    },
  });
  namespace.addVariable({
    componentOf: estacion1,
    browseName: "Sello",
    nodeId: "ns=1;s=Estacion1.Sello", // (Este ya estaba bien)
    dataType: DataType.Boolean,
    minimumSamplingInterval: 1000,
    value: {
      get: () => {
        s1_sello = getSimulatedSelection(true, false, 0.05);
        return new Variant({ dataType: DataType.Boolean, value: s1_sello });
      },
    },
  });

  // ==========================================================
  // --- Estación 2: Montaje Impulsor (MAPEO CORREGIDO) ---
  // ==========================================================
  const estacion2 = namespace.addObject({
    componentOf: bomba,
    browseName: "Estacion2_Impulsor",
  });

  // --- Tags Específicos de Estación 2 ---
  namespace.addVariable({
    componentOf: estacion2,
    browseName: "NumeroSerie",
    nodeId: "ns=1;s=Estacion2.NumeroSerie", // <-- CORREGIDO
    dataType: DataType.String,
    value: new Variant({ dataType: DataType.String, value: slotsEstacion[1] }),
  });
  namespace.addVariable({
    componentOf: estacion2,
    browseName: "Disparador",
    nodeId: "ns=1;s=Estacion2.Disparador", // <-- CORREGIDO
    dataType: DataType.Boolean,
    value: new Variant({ dataType: DataType.Boolean, value: false }),
  });

  // --- Parámetros de Proceso E2 ---
  namespace.addVariable({
    componentOf: estacion2,
    browseName: "Balanceo",
    nodeId: "ns=1;s=Estacion2.Balanceo", // (Este ya estaba bien)
    dataType: DataType.Double,
    minimumSamplingInterval: 1000,
    value: {
      get: () => {
        s2_balanceo = getSimulatedValue(0.1, 0.5, s2_balanceo, 0.1, 0.6);
        return new Variant({ dataType: DataType.Double, value: s2_balanceo });
      },
    },
  });
  namespace.addVariable({
    componentOf: estacion2,
    browseName: "Holgura",
    nodeId: "ns=1;s=Estacion2.Holgura", // (Este ya estaba bien)
    dataType: DataType.Double,
    minimumSamplingInterval: 1000,
    value: {
      get: () => {
        s2_holgura = getSimulatedValue(0.02, 0.05, s2_holgura, 0.1, 0.6);
        return new Variant({ dataType: DataType.Double, value: s2_holgura });
      },
    },
  });
  namespace.addVariable({
    componentOf: estacion2,
    browseName: "Seguro",
    nodeId: "ns=1;s=Estacion2.Seguro", // (Este ya estaba bien)
    dataType: DataType.Boolean,
    minimumSamplingInterval: 1000,
    value: {
      get: () => {
        s2_seguro = getSimulatedSelection(true, false, 0.05);
        return new Variant({ dataType: DataType.Boolean, value: s2_seguro });
      },
    },
  });

  // ==========================================================
  // --- Estación 3: Prueba de Fugas (MAPEO CORREGIDO) ---
  // ==========================================================
  const estacion3 = namespace.addObject({
    componentOf: bomba,
    browseName: "Estacion3_PruebaFugas",
  });

  // --- Tags Específicos de Estación 3 ---
  namespace.addVariable({
    componentOf: estacion3,
    browseName: "NumeroSerie",
    nodeId: "ns=1;s=Estacion3.NumeroSerie", // <-- CORREGIDO
    dataType: DataType.String,
    value: new Variant({ dataType: DataType.String, value: slotsEstacion[2] }),
  });
  namespace.addVariable({
    componentOf: estacion3,
    browseName: "Disparador",
    nodeId: "ns=1;s=Estacion3.Disparador", // <-- CORREGIDO
    dataType: DataType.Boolean,
    value: new Variant({ dataType: DataType.Boolean, value: false }),
  });

  // --- Parámetros de Proceso E3 ---
  namespace.addVariable({
    componentOf: estacion3,
    browseName: "Presion",
    nodeId: "ns=1;s=Estacion3.Presion", // (Este ya estaba bien)
    dataType: DataType.Double,
    minimumSamplingInterval: 1000,
    value: {
      get: () => {
        s3_presion = getSimulatedValue(1.5, 2.0, s3_presion, 0.1, 3.4);
        return new Variant({ dataType: DataType.Double, value: s3_presion });
      },
    },
  });
  namespace.addVariable({
    componentOf: estacion3,
    browseName: "Fuga",
    nodeId: "ns=1;s=Estacion3.Fuga", // (Este ya estaba bien)
    dataType: DataType.Boolean,
    minimumSamplingInterval: 1000,
    value: {
      get: () => {
        s3_fuga = getSimulatedSelection(false, true, 0.15);
        return new Variant({ dataType: DataType.Boolean, value: s3_fuga });
      },
    },
  });
  namespace.addVariable({
    componentOf: estacion3,
    browseName: "Inspeccion",
    nodeId: "ns=1;s=Estacion3.Inspeccion", // (Este ya estaba bien)
    dataType: DataType.String,
    minimumSamplingInterval: 1000,
    value: {
      get: () => {
        s3_inspeccion = getSimulatedSelection("OK", "NO OK", 0.05);
        return new Variant({ dataType: DataType.String, value: s3_inspeccion });
      },
    },
  });

  console.log("Variables de simulación de 3 estaciones (Takt Time) creadas.");

  // ==========================================================
  // --- Lógica de Simulación (Máquina de Estados / Takt Time) ---
  // (CORREGIDA PARA USAR LOS NUEVOS NodeIds)
  // ==========================================================
  setInterval(() => {
    // 1. Generar nuevo N° Serie
    const timestamp = Date.now().toString();
    const nuevoSerie = `BOMBA-${timestamp.slice(-6)}`;

    // 2. Mover los productos en la línea (Takt Time)
    slotsEstacion[2] = slotsEstacion[1]; // E3 <- E2
    slotsEstacion[1] = slotsEstacion[0]; // E2 <- E1
    slotsEstacion[0] = nuevoSerie; // E1 <- Nuevo

    console.log("\n[SIMULADOR] ¡Takt Time! Flujo de línea actualizado:");
    console.log(`  Estación 1: ${slotsEstacion[0]}`);
    console.log(`  Estación 2: ${slotsEstacion[1]}`);
    console.log(`  Estación 3: ${slotsEstacion[2]}`);

    // 3. Actualizar los tags de N° Serie en el servidor OPC UA
    (
      addressSpace.findNode("ns=1;s=Estacion1.NumeroSerie") as UAVariable
    ).setValueFromSource(
      new Variant({ dataType: DataType.String, value: slotsEstacion[0] })
    );
    (
      addressSpace.findNode("ns=1;s=Estacion2.NumeroSerie") as UAVariable
    ).setValueFromSource(
      new Variant({ dataType: DataType.String, value: slotsEstacion[1] })
    );
    (
      addressSpace.findNode("ns=1;s=Estacion3.NumeroSerie") as UAVariable
    ).setValueFromSource(
      new Variant({ dataType: DataType.String, value: slotsEstacion[2] })
    );

    // 4. Activar TODOS los disparadores (simula que todas las estaciones terminaron)
    if (slotsEstacion[0] !== "(vacio)") {
      (
        addressSpace.findNode("ns=1;s=Estacion1.Disparador") as UAVariable
      ).setValueFromSource(
        new Variant({ dataType: DataType.Boolean, value: true })
      );
    }
    if (slotsEstacion[1] !== "(vacio)") {
      (
        addressSpace.findNode("ns=1;s=Estacion2.Disparador") as UAVariable
      ).setValueFromSource(
        new Variant({ dataType: DataType.Boolean, value: true })
      );
    }
    if (slotsEstacion[2] !== "(vacio)") {
      (
        addressSpace.findNode("ns=1;s=Estacion3.Disparador") as UAVariable
      ).setValueFromSource(
        new Variant({ dataType: DataType.Boolean, value: true })
      );
    }

    console.log(
      "[SIMULADOR] Disparadores Estacion1, Estacion2, Estacion3 activados (si hay producto)."
    );

    // 5. Resetear los disparadores después de 1 segundo
    setTimeout(() => {
      (
        addressSpace.findNode("ns=1;s=Estacion1.Disparador") as UAVariable
      ).setValueFromSource(
        new Variant({ dataType: DataType.Boolean, value: false })
      );
      (
        addressSpace.findNode("ns=1;s=Estacion2.Disparador") as UAVariable
      ).setValueFromSource(
        new Variant({ dataType: DataType.Boolean, value: false })
      );
      (
        addressSpace.findNode("ns=1;s=Estacion3.Disparador") as UAVariable
      ).setValueFromSource(
        new Variant({ dataType: DataType.Boolean, value: false })
      );
    }, 1000);
  }, TaktTime); // Cada 10 segundos
}

/**
 * Función principal autoejecutable
 */
(async () => {
  try {
    const server = new OPCUAServer({
      //hostname: "localhost",
      port: 4840,
      resourcePath: "/UA/SimulationServer",
      buildInfo: {
        productName: "Servidor Simulación Trazabilidad (3 Estaciones)",
        buildNumber: "3.1.0", // Versión 3.1 (Corregida)
        buildDate: new Date(),
      },
    });

    await server.initialize();
    construirAddressSpace(server);
    await server.start();

    const endpointUrl =
      server.endpoints[0].endpointDescriptions()[0].endpointUrl;
    console.log(`\n✅ Servidor de Simulación OPC UA iniciado.`);
    console.log(`   Hostname: ${os.hostname()}`);
    console.log(`   Endpoint URL: ${endpointUrl}`);
    console.log("\nPresiona Ctrl+C para detener el servidor.");
  } catch (err: any) {
    console.error("Error al iniciar el servidor de simulación:", err.message);
    process.exit(1);
  }
})();
