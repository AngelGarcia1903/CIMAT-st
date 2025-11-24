# Manual de Usuario: Sistema de Trazabilidad

## 1. Introducción

Bienvenido al Sistema de Trazabilidad Industrial. Este software está diseñado para permitir la configuración, gestión y monitoreo de líneas de producción industrial en tiempo real.

El sistema cuenta con dos roles principales:

- **Administrador:** Tiene control total sobre la configuración del sistema, la gestión de usuarios y el monitoreo de la producción.
- **Operador:** Tiene acceso de solo lectura al monitoreo de la producción y puede registrar datos en estaciones que requieran intervención manual.

---

## 2. Acceso al Sistema

### 2.1. Inicio de Sesión

Para acceder al sistema, navegue a la página de inicio e ingrese sus credenciales (nombre de usuario y contraseña).

**Credenciales de prueba (Administrador):**

- Usuario: `admin`
- Contraseña: `123`

**Credenciales de prueba (Operador):**

- Usuario: `operador`
- Contraseña: `123`

### 2.2. Expiración de Sesión

Por seguridad, la sesión de usuario expira después de una hora de inactividad. Si esto ocurre, el sistema mostrará un mensaje y lo redirigirá automáticamente a la página de inicio de sesión.

---

## 3. Funcionalidades del Administrador

### 3.1. Dashboard Principal

Al iniciar sesión, la primera pantalla que verá es el Dashboard de Producción. Esta vista ofrece un resumen ejecutivo del estado de todas las líneas de producción configuradas.

Cada línea se representa con una "tarjeta" que muestra:

- **Nombre y descripción** de la línea.
- **Lote Activo:** El nombre del lote que se encuentra actualmente en producción. Si no hay ninguno, mostrará "Ninguno".
- **Botón "Iniciar/Finalizar Lote":** Un botón dinámico que permite iniciar un nuevo lote (si no hay uno activo) o finalizar el lote actual.
- **Botón "Monitor":** Un acceso directo a la vista de monitoreo en tiempo real para esa línea específica.

### 3.2. Gestión de Líneas de Producción (Configuración)

Esta es la sección principal para construir y modificar la estructura de su fábrica. Se accede a través del menú lateral "Configuración".

#### 3.2.1. Creación de una Línea (Flujo Interactivo)

Haga clic en el botón `+` en la sección "Líneas de Producción" del menú lateral o navegue a la página de "Configuración" y seleccione "Crear Nueva Línea".

1.  **Paso 1: Crear Línea:** Ingrese el nombre y la descripción de la línea y haga clic en "Crear Línea y Continuar".
2.  **Paso 2: Agregar Estaciones:** Será redirigido a una nueva página para agregar estaciones a la línea recién creada. El sistema calculará automáticamente el número de orden de la estación.
3.  **Paso 3: Agregar Parámetros:** Dentro del formulario de la estación, puede agregar múltiples parámetros. Cada parámetro requiere:
    - **Nombre:** Identificador del parámetro (ej: "Temperatura").
    - **Dirección OPC UA:** El `NodeId` del tag en el servidor de simulación que corresponde a este parámetro.
    - **Tipo:**
      - **Numérico:** Para mediciones. Permite definir un valor mínimo y máximo para control de calidad.
      - **Texto:** Para entradas manuales. Permite definir una lista de opciones predefinidas (separadas por comas) para estandarizar la entrada de datos.
      - **Booleano:** Para verificaciones de tipo Sí/No.
    - **Guardado Individual:** Puede guardar cada parámetro individualmente usando el ícono de disco . Si es el primer parámetro y la estación aún no ha sido creada, al guardar se creará tanto la estación como el parámetro.
    - **Guardado Completo:** Al hacer clic en "Guardar Estación y Parámetros", se guardará la estación con todos los parámetros listados en el formulario.

#### 3.2.2. Edición y Eliminación

Desde la estructura de árbol en el menú lateral, cada elemento (línea, estación, parámetro) tiene íconos para:

- **Editar:** Abre un modal para modificar la información del elemento.
- **Eliminar:** Muestra un modal de confirmación antes de eliminar el elemento de forma permanente.

### 3.3. Simulador de Producción

El simulador es una herramienta de desarrollo y prueba. Le permite "fingir" el paso de un producto a través de las estaciones para verificar que la lógica de registro y la actualización en tiempo real del monitor funcionan correctamente.

1.  Seleccione la línea a simular.
2.  Ingrese un número de serie para un producto virtual.
3.  Llene los valores para los parámetros de la estación actual.
4.  Haga clic en "Registrar y Avanzar".

---

## 4. Pruebas Funcionales (Sección para Documentación de Pruebas)

Esta sección será completada con los resultados de las pruebas formales. Las pruebas a realizar incluyen, pero no se limitan a:

### 4.1. Pruebas de Autenticación

- **Prueba 1.1:** Inicio de sesión exitoso con credenciales de admin.
- **Prueba 1.2:** Inicio de sesión fallido con contraseña incorrecta.
- **Prueba 1.3:** Redirección automática al expirar el token.

### 4.2. Pruebas de Flujo de Creación (CRUD)

- **Prueba 2.1:** Crear una línea de producción.
- **Prueba 2.2:** Añadir 3 estaciones a la línea, verificando que el orden se calcule correctamente.
- **Prueba 2.3:** Añadir parámetros de tipo numérico, texto y booleano a una estación.
- **Prueba 2.4:** Guardar un parámetro individualmente, verificando la creación implícita de la estación.
- **Prueba 2.5:** Editar el nombre de una línea y verificar que se actualice en el árbol.
- **Prueba 2.6:** Eliminar un parámetro y verificar que desaparezca del árbol.

### 4.3. Pruebas de Lógica de Producción

- **Prueba 3.1:** Iniciar un lote en una línea desde el dashboard.
- **Prueba 3.2:** Finalizar el mismo lote desde el dashboard.
- **Prueba 3.3:** Usar el simulador para registrar un producto con valores "OK".
- **Prueba 3.4:** Verificar que el producto aparezca en la tabla del monitor en menos de 5 segundos.
