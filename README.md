# OpenTracker Admin

Panel de administración web para OpenTracker - Sistema de gestión de registros de jornada laboral.

## Características

- **Autenticación segura**: Solo usuarios con rol "admin" pueden acceder
- **Gestión de trabajadores**: CRUD completo de trabajadores
  - Crear nuevos trabajadores
  - Editar información de trabajadores
  - Eliminar trabajadores (eliminación lógica)
- **Visualización de registros**: Ver todos los registros de entrada/salida con filtros por fecha
- **Dashboard**: Estadísticas y accesos rápidos a funcionalidades principales

## Tecnologías

- Next.js 15.3.0 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4.1.9
- Axios para comunicación con API
- React Hot Toast para notificaciones

## Requisitos previos

- Node.js 18+
- npm o yarn
- La API de OpenTracker corriendo en `http://localhost:8080`

## Instalación

1. Instalar dependencias:

```bash
npm install
```

2. Configurar variables de entorno:

Copiar `.env.example` a `.env` y configurar:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME=OpenTracker
NEXT_PUBLIC_APP_LOGO=/logo.png
```

**Variables de entorno disponibles:**

- `NEXT_PUBLIC_API_URL`: URL de la API de OpenTracker (por defecto: `http://localhost:8080`)
- `NEXT_PUBLIC_APP_NAME`: Nombre de la aplicación que se muestra en la UI (por defecto: `OpenTracker`)
- `NEXT_PUBLIC_APP_LOGO`: Ruta al logo de la aplicación (por defecto: `/logo.png`). Debe estar en la carpeta `public/`

3. Ejecutar en modo desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3001`

## Scripts disponibles

- `npm run dev` - Ejecuta el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm start` - Inicia la aplicación en modo producción
- `npm run lint` - Ejecuta el linter

## 🐳 Imagen Docker

La imagen oficial está disponible en GitHub Container Registry:

```bash
# Última versión
docker pull ghcr.io/opentracker-es/opentracker-admin:latest

# Versión específica
docker pull ghcr.io/opentracker-es/opentracker-admin:1.0.0
```

**Plataformas soportadas:** linux/amd64, linux/arm64

## Despliegue con Docker

Para desplegar en producción con Docker:

```bash
# Configurar variables de entorno
cp .env.production.example .env.production
# Editar .env.production con tus valores

# Construir y ejecutar
docker-compose -f docker-compose.prod.yml up -d
```

**Características de Docker:**
- Multi-stage build para optimizar el tamaño de la imagen (~200MB)
- Next.js standalone mode habilitado
- Usuario no-root para seguridad
- Healthcheck incluido
- Auto-restart en caso de fallo

Para más detalles, ver [README.Docker.md](./README.Docker.md)

## Estructura del proyecto

```
opentracker-admin/
├── src/
│   ├── app/                 # Páginas de Next.js (App Router)
│   │   ├── login/           # Página de login
│   │   ├── workers/         # Gestión de trabajadores
│   │   │   ├── new/         # Crear trabajador
│   │   │   └── [id]/edit/   # Editar trabajador
│   │   ├── time-records/    # Visualización de registros
│   │   ├── layout.tsx       # Layout principal
│   │   └── page.tsx         # Dashboard
│   ├── components/          # Componentes reutilizables
│   │   ├── AppWrapper.tsx   # Wrapper con sidebar, topnav, footer
│   │   ├── Sidebar.tsx      # Barra lateral de navegación
│   │   ├── TopNav.tsx       # Barra superior
│   │   ├── Footer.tsx       # Pie de página
│   │   └── ProtectedRoute.tsx # HOC para rutas protegidas
│   ├── contexts/            # Contextos de React
│   │   └── AuthContext.tsx  # Context de autenticación
│   └── lib/                 # Utilidades
│       └── api-client.ts    # Cliente HTTP para la API
├── public/                  # Archivos estáticos
├── .env.example             # Ejemplo de variables de entorno
└── package.json
```

## Autenticación

El sistema de autenticación funciona de la siguiente manera:

1. Usuario ingresa credenciales en `/login`
2. Se valida que el usuario tenga rol "admin"
3. Se almacena el token JWT en localStorage
4. Todas las rutas (excepto /login) están protegidas
5. El token se incluye automáticamente en todas las peticiones a la API
6. Si el token expira, se redirige automáticamente a /login

## Personalización

### Branding

Puedes personalizar el nombre y logo de la aplicación mediante las variables de entorno:

1. **Cambiar el nombre de la aplicación:**
   ```bash
   NEXT_PUBLIC_APP_NAME="Mi Sistema"
   ```
   Esto cambiará el nombre en:
   - Sidebar
   - Página de login
   - Dashboard
   - Footer
   - Título del navegador

2. **Cambiar el logo:**
   ```bash
   NEXT_PUBLIC_APP_LOGO="/mi-logo.png"
   ```
   - Coloca tu logo en la carpeta `public/` del proyecto
   - El logo se mostrará en el sidebar y en la página de login
   - Tamaño recomendado: 64x64px para el login, 32x32px para el sidebar

### Colores del tema

El diseño utiliza los mismos colores que la landing page de OpenTracker:

- **Accent**: Verde (`oklch(0.65 0.2 150)`)
- Soporte para modo claro y oscuro
- Variables CSS para fácil personalización en `src/app/globals.css`

## Endpoints de la API utilizados

- `POST /api/token` - Autenticación
- `GET /api/users/me` - Obtener usuario actual
- `GET /api/workers/` - Listar trabajadores
- `POST /api/workers/` - Crear trabajador
- `GET /api/workers/{id}` - Obtener trabajador
- `PUT /api/workers/{id}` - Actualizar trabajador
- `DELETE /api/workers/{id}` - Eliminar trabajador (soft delete)
- `GET /api/time-records/` - Listar registros
- `GET /api/time-records/worker/{id}` - Registros por trabajador

## Desarrollo

### Agregar una nueva página

1. Crear archivo en `src/app/nueva-ruta/page.tsx`
2. Usar `AppWrapper` para incluir layout
3. La ruta estará protegida automáticamente

### Agregar endpoint a la API

1. Agregar método en `src/lib/api-client.ts`
2. Usar en componentes: `await apiClient.nuevoMetodo()`

## 📄 Licencia

GNU Affero General Public License v3.0 (AGPL-3.0) - Ver archivo LICENSE en la raíz del proyecto.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor abre un issue antes de hacer cambios grandes.

## 🔗 Enlaces

- **Sitio web**: [www.opentracker.es](https://www.opentracker.es)
- **Email**: info@opentracker.es

---

Parte del proyecto [OpenTracker](https://www.opentracker.es)
