import {
  OPCUAServer,
  Variant,
  DataType,
  AddressSpace,
  UAVariable,
} from "node-opcua";
import os from "os";

// --- Constantes Globales (BICI) ---
const TaktTime = 10000;
const ID_GLOBAL_DISPARADOR = "ns=1;s=BICI.GlobalTrigger";
const ID_GLOBAL_NUMERO_SERIE = "ns=1;s=BICI.GlobalSerial";

// --- Valores en Memoria (Se quedan para simular la variación en los tags) ---
let s1_temp = 220.0,
  s1_flux = true,
  s1_visual = "OK";
let s2_espesor = 85.0,
  s2_brillo = 90.0,
  s2_uniforme = true;
let s3_presion = 32.0,
  s3_frenos = true,
  s3_cambios = "OK";

// Global variable to hold the current serial number string
let currentGlobalSerial = "BICI-G-000000";

function getSimulatedValue(
  min: number,
  max: number,
  current: number,
  rate: number,
  failVal: number
): number {
  if (Math.random() < rate) return failVal;
  const variacion = (Math.random() - 0.5) * (max - min) * 0.1;
  return parseFloat(
    Math.max(min, Math.min(max, current + variacion)).toFixed(2)
  );
}
function getSimulatedSelection<T>(pass: T, fail: T, rate: number): T {
  return Math.random() < rate ? fail : pass;
}

/**
 * Esta función construye el AddressSpace (la estructura de tags del PLC).
 */
function construirAddressSpace(server: OPCUAServer) {
  const addressSpace = server.engine.addressSpace;
  if (!addressSpace) throw new Error("AddressSpace no inicializado.");
  const namespace = addressSpace.getOwnNamespace();

  const bici = namespace.addObject({
    organizedBy: addressSpace.rootFolder.objects,
    browseName: "BicicletaGlobal",
  });

  // ==========================================================
  // 1. TAGS GLOBALES (Disparador y N° Serie)
  // ==========================================================
  const numSerieNode = namespace.addVariable({
    componentOf: bici,
    browseName: "NumeroSerie",
    nodeId: ID_GLOBAL_NUMERO_SERIE,
    dataType: DataType.String,
    value: new Variant({
      dataType: DataType.String,
      value: currentGlobalSerial,
    }),
  });

  const triggerNode = namespace.addVariable({
    componentOf: bici,
    browseName: "Disparador",
    nodeId: ID_GLOBAL_DISPARADOR,
    dataType: DataType.Boolean,
    value: new Variant({ dataType: DataType.Boolean, value: false }),
  });

  // ==========================================================
  // 2. TAGS DE PARÁMETROS (Sin cambios, ya son únicos)
  // ==========================================================

  // Estación 1: Soldadura
  const e1 = namespace.addObject({
    componentOf: bici,
    browseName: "E1_Soldadura",
  });
  namespace.addVariable({
    componentOf: e1,
    browseName: "Temperatura",
    nodeId: "ns=1;s=BICI.Soldadura.Temp",
    dataType: DataType.Double,
    minimumSamplingInterval: 1000,
    value: {
      get: () =>
        new Variant({
          dataType: DataType.Double,
          value: getSimulatedValue(200, 250, s1_temp, 0.05, 150.0),
        }),
    },
  });
  namespace.addVariable({
    componentOf: e1,
    browseName: "FluxOK",
    nodeId: "ns=1;s=BICI.Soldadura.Flux",
    dataType: DataType.Boolean,
    minimumSamplingInterval: 1000,
    value: {
      get: () =>
        new Variant({
          dataType: DataType.Boolean,
          value: getSimulatedSelection(true, false, 0.05),
        }),
    },
  });
  namespace.addVariable({
    componentOf: e1,
    browseName: "Visual",
    nodeId: "ns=1;s=BICI.Soldadura.Visual",
    dataType: DataType.String,
    minimumSamplingInterval: 1000,
    value: {
      get: () =>
        new Variant({
          dataType: DataType.String,
          value: getSimulatedSelection("OK", "NO OK", 0.1),
        }),
    },
  });

  // Estación 2: Pintura
  const e2 = namespace.addObject({
    componentOf: bici,
    browseName: "E2_Pintura",
  });
  namespace.addVariable({
    componentOf: e2,
    browseName: "Espesor",
    nodeId: "ns=1;s=BICI.Pintura.Espesor",
    dataType: DataType.Double,
    minimumSamplingInterval: 1000,
    value: {
      get: () =>
        new Variant({
          dataType: DataType.Double,
          value: getSimulatedValue(50, 100, s2_espesor, 0.05, 20.0),
        }),
    },
  });
  namespace.addVariable({
    componentOf: e2,
    browseName: "Brillo",
    nodeId: "ns=1;s=BICI.Pintura.Brillo",
    dataType: DataType.Double,
    minimumSamplingInterval: 1000,
    value: {
      get: () =>
        new Variant({
          dataType: DataType.Double,
          value: getSimulatedValue(80, 100, s2_brillo, 0.05, 50.0),
        }),
    },
  });
  namespace.addVariable({
    componentOf: e2,
    browseName: "Uniforme",
    nodeId: "ns=1;s=BICI.Pintura.Uniforme",
    dataType: DataType.Boolean,
    minimumSamplingInterval: 1000,
    value: {
      get: () =>
        new Variant({
          dataType: DataType.Boolean,
          value: getSimulatedSelection(true, false, 0.05),
        }),
    },
  });

  // Estación 3: Ensamble Final
  const e3 = namespace.addObject({
    componentOf: bici,
    browseName: "E3_Ensamble",
  });
  namespace.addVariable({
    componentOf: e3,
    browseName: "PresionLlantas",
    nodeId: "ns=1;s=BICI.Ensamble.Presion",
    dataType: DataType.Double,
    minimumSamplingInterval: 1000,
    value: {
      get: () =>
        new Variant({
          dataType: DataType.Double,
          value: getSimulatedValue(30, 35, s3_presion, 0.05, 10.0),
        }),
    },
  });
  namespace.addVariable({
    componentOf: e3,
    browseName: "FrenosOK",
    nodeId: "ns=1;s=BICI.Ensamble.Frenos",
    dataType: DataType.Boolean,
    minimumSamplingInterval: 1000,
    value: {
      get: () =>
        new Variant({
          dataType: DataType.Boolean,
          value: getSimulatedSelection(true, false, 0.05),
        }),
    },
  });
  namespace.addVariable({
    componentOf: e3,
    browseName: "CambiosOK",
    nodeId: "ns=1;s=BICI.Ensamble.Cambios",
    dataType: DataType.String,
    minimumSamplingInterval: 1000,
    value: {
      get: () =>
        new Variant({
          dataType: DataType.String,
          value: getSimulatedSelection("OK", "Falla", 0.1),
        }),
    },
  });

  console.log("Variables de simulación GLOBAL creadas.");

  // ==========================================================
  // 3. Lógica de Simulación (GLOBAL = UNA SOLA PASADA)
  // ==========================================================
  setInterval(() => {
    // 1. Generar nuevo N° Serie
    const timestamp = Date.now().toString();
    currentGlobalSerial = `BICI-G-${timestamp.slice(-6)}`; // Actualizamos la variable global

    // 2. Escribir el N° de Serie GLOBAL
    (
      addressSpace.findNode(ID_GLOBAL_NUMERO_SERIE) as UAVariable
    ).setValueFromSource(
      new Variant({ dataType: DataType.String, value: currentGlobalSerial })
    );

    // 3. Activar el Disparador GLOBAL (Solo UNO)
    (
      addressSpace.findNode(ID_GLOBAL_DISPARADOR) as UAVariable
    ).setValueFromSource(
      new Variant({ dataType: DataType.Boolean, value: true })
    );

    console.log(
      `\n[SIM-GLOBAL] Trigger Global activado. Nuevo producto: ${currentGlobalSerial}`
    );

    // 4. Resetear el disparador después de 1 segundo
    setTimeout(() => {
      (
        addressSpace.findNode(ID_GLOBAL_DISPARADOR) as UAVariable
      ).setValueFromSource(
        new Variant({ dataType: DataType.Boolean, value: false })
      );
    }, 1000);
  }, TaktTime);
}

(async () => {
  try {
    const server = new OPCUAServer({
      port: 4841,
      resourcePath: "/UA/SimulationServer",
    });
    await server.initialize();
    construirAddressSpace(server);
    await server.start();
    console.log(
      `\n✅ Servidor BICI Global iniciado en opc.tcp://${os.hostname()}:4841/UA/SimulationServer`
    );
  } catch (err: any) {
    process.exit(1);
  }
})();
