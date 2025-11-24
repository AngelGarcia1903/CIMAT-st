# Manual Técnico: Sistema de Trazabilidad

## 1. Introducción y Arquitectura

El Sistema de Trazabilidad es una aplicación web full-stack diseñada bajo una arquitectura **cliente-servidor**. Su objetivo es proporcionar una plataforma robusta para la configuración y monitoreo de procesos de producción industrial, con una futura integración con servidores OPC UA.

- **Cliente (Frontend):** Una Single-Page Application (SPA) construida con React, responsable de la interfaz de usuario y la experiencia interactiva.
- **Servidor (Backend):** Una API RESTful construida con Node.js y Express, responsable de la lógica de negocio, la gestión de la base de datos y la autenticación.

---

## 2. Pila Tecnológica (Stack)

### 2.1. Backend

- **Runtime:** Node.js
- **Framework:** Express.js
- **Lenguaje:** TypeScript
- **ORM:** Prisma
- **Base de Datos:** MySQL
- **Autenticación:** JSON Web Tokens (JWT) con `jsonwebtoken` y `bcryptjs` para el hasheo de contraseñas.
- **Dependencias Clave:** `cors`, `dotenv`, `nodemon`, `ts-node`.

### 2.2. Frontend

- **Framework:** React (con Vite como empaquetador)
- **Lenguaje:** TypeScript
- **Gestión de Estado del Servidor:** TanStack Query (React Query)
- **Routing:** React Router DOM
- **Estilos:** Tailwind CSS
- **Animaciones:** Framer Motion
- **Peticiones HTTP:** Axios
- **Notificaciones:** React Hot Toast
- **Iconografía:** React Icons
- **Dependencias Clave:** `jwt-decode`.

---

## 3. Arquitectura del Backend

El backend sigue un patrón de diseño modular para separar responsabilidades.

### 3.1. Estructura de Carpetas

- `prisma/`: Contiene el `schema.prisma` (la única fuente de verdad para la base de datos) y la carpeta `migrations`.
- `src/controllers/`: Contiene la lógica de negocio. Cada función aquí maneja una solicitud específica (ej: `createLinea`, `iniciarLote`).
- `src/routes/`: Define los endpoints de la API (ej: `POST /api/lineas`) y los asocia con las funciones del controlador.
- `src/middlewares/`: Contiene funciones que se ejecutan antes de los controladores, como `authMiddleware` (verifica JWT) y `adminMiddleware` (verifica rol).
- `src/types/`: Contiene definiciones de tipos globales para TypeScript.
- `server.ts`: El punto de entrada de la aplicación. Configura Express, middlewares globales (CORS, JSON) y registra las rutas.
- `seed.ts`: Script para poblar la base de datos con datos iniciales de prueba.

### 3.2. Base de Datos (schema.prisma)

El esquema define los siguientes modelos principales:

- **Usuario:** Almacena las credenciales y roles (`admin`, `operador`).
- **LineaProduccion:** La entidad principal de una línea.
- **Estacion:** Una etapa dentro de una `LineaProduccion`, con un campo `orden`.
- **Parametro:** Una medición dentro de una `Estacion`. Incluye `direccionOpcUa` para el mapeo.
- **Lote:** Agrupación de productos. Tiene un estado (`PENDIENTE`, `ACTIVO`, `FINALIZADO`).
- **Producto:** Una unidad individual, identificada por un `numeroSerie` único.
- **Registro:** La unidad de trazabilidad. Guarda el valor de un `Parametro` para un `Producto` en una `Estacion`.

### 3.3. Flujo de Autenticación

1.  El cliente envía `username` y `password` al endpoint `POST /api/auth/login`.
2.  `authController` verifica las credenciales contra la base de datos.
3.  Si son válidas, genera un **JWT** (conteniendo `id` y `rol`) con una expiración de 1 hora.
4.  El cliente almacena este token en `localStorage`.
5.  Para cada petición a una ruta protegida, el cliente envía el token en el header `Authorization: Bearer <token>`.
6.  `authMiddleware` en el backend intercepta la petición, valida el token y adjunta los datos del usuario (`req.user`).

---

## 4. Arquitectura del Frontend

El frontend está estructurado con una filosofía de **component-based architecture**.

### 4.1. Estructura de Carpetas

- `src/components/`: Contiene componentes reutilizables (Layouts, common, Lineas).
- `src/pages/`: Contiene los componentes que representan una vista o página completa (ej: `HomePage`, `MonitorProduccionPage`).
- `src/hooks/`: Contiene custom hooks (ej: `useAuth`) para encapsular lógica.
- `src/services/`: Centraliza la comunicación con el backend. `api.ts` configura Axios con interceptores para manejar tokens y expiración de sesión.

### 4.2. Gestión de Estado

El estado se divide en dos categorías:

- **Estado del Servidor:** Gestionado por **TanStack Query**. Todas las interacciones con la API (`useQuery`, `useMutation`) obtienen caching, re-fetching automático y estados de carga/error.
- **Estado de la UI:** Gestionado localmente con `useState` y `useEffect` (para formularios, modales, pestañas activas).

### 4.3. Componentes Clave

- `MainLayout.tsx`: Define la estructura principal (cabecera y Sidebar). Renderiza las páginas a través de un `<Outlet />`.
- `Sidebar.tsx`: Navegación lateral. Renderiza condicionalmente los enlaces según el rol del usuario.
- `LineasTree.tsx`: Componente recursivo que consume `GET /api/lineas` y renderiza la estructura jerárquica de la fábrica.
- `MonitorProduccionPage.tsx`: Utiliza `useQuery` con `refetchInterval` para consultar periódicamente el endpoint de registros, creando un efecto de monitoreo en tiempo real.

---

## 5. Configuración del Entorno de Desarrollo

Para ejecutar este proyecto localmente, se requiere un entorno de Node.js y una base de datos MySQL.

### Requisitos Previos

- **Node.js:** v18 o superior.
- **Git:** Para la clonación del repositorio.
- **Servidor MySQL:** v8.0 o superior.

**Nota importante sobre XAMPP:** Se puede utilizar XAMPP para gestionar la base de datos. Sin embargo, para este proyecto **solo es necesario iniciar el servicio de MySQL**. El servicio de Apache **NO** debe iniciarse, ya que el frontend (Vite) y el backend (Express) proveen sus propios servidores de desarrollo.

---

### 5.1. Configuración del Backend

1.  Navegue a la carpeta `/backend` del proyecto.
2.  Cree un archivo `.env` en la raíz de `/backend`. Este archivo **no** debe ser versionado y debe contener las variables de entorno, principalmente la URL de conexión a la base de datos:
    ```env
    DATABASE_URL="mysql://USUARIO:PASSWORD@localhost:3306/TRAZABILIDAD"
    JWT_SECRET="TU_SECRETO_JWT_AQUI"
    ```
3.  Instale todas las dependencias de Node.js:
    ```bash
    npm install
    ```
4.  Aplique las migraciones de la base de datos. Este comando leerá el `schema.prisma` y creará todas las tablas en su base de datos MySQL:
    ```bash
    npx prisma migrate dev
    ```
5.  (Opcional) Pueble la base de datos con datos de prueba (usuarios admin/operador y líneas de ejemplo):
    ```bash
    npx ts-node --compiler-options '{"module": "CommonJS"}' seed.ts
    ```
6.  Inicie el servidor de desarrollo del backend:
    ```bash
    npm run dev
    ```
    El servidor se ejecutará en `http://localhost:4000`.

---

### 5.2. Configuración del Frontend

1.  Abra una **nueva terminal** (manteniendo el backend corriendo).
2.  Navegue a la carpeta `/frontend` del proyecto.
3.  Instale todas las dependencias:
    ```bash
    npm install
    ```
4.  Inicie el servidor de desarrollo de Vite:
    ```bash
    npm run dev
    ```
    El servidor se ejecutará en `http://localhost:5173` y se abrirá automáticamente en su navegador. La aplicación está configurada para conectarse al backend en el puerto 4000.

### 5.3. Frontend

1.  Instalar dependencias: `npm install`.
2.  Iniciar el servidor de desarrollo: `npm run dev`.

---

## 6. Pruebas (Sección para Documentación de Pruebas)

Esta sección será completada con la documentación de la estrategia de pruebas y los resultados.

La estrategia de pruebas deberá cubrir tres niveles:

- **Pruebas Unitarias:** Para funciones de lógica de negocio puras.
- **Pruebas de Integración:** Para verificar que los endpoints del backend interactúan correctamente con una base de datos de prueba.
- **Pruebas End-to-End (E2E):** Para simular el flujo completo del usuario en el navegador (ej: iniciar sesión, crear una línea, verificar el monitor). Se recomienda usar **Cypress** o **Playwright**.
