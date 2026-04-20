> 🇬🇧 [Read in English](README.en.md)

# OpenJornada Admin

Panel de administración web para OpenJornada - Sistema de gestión de registros de jornada laboral.

## Características

- **Autenticación segura**: Solo usuarios con rol "admin" pueden acceder
- **Gestión de trabajadores**: CRUD completo de trabajadores
  - Crear nuevos trabajadores
  - Editar información de trabajadores
  - Eliminar trabajadores (eliminación lógica)
- **Visualización de registros**: Ver todos los registros de entrada/salida con filtros por fecha
- **Dashboard**: Estadísticas y accesos rápidos a funcionalidades principales
- **Informes y cumplimiento**: Informes mensuales, exportación (CSV/XLSX/PDF) y firmas
  - Informe mensual por trabajador con desglose diario
  - Informe mensual por empresa con resumen por trabajador
  - Estado de firmas mensuales de los trabajadores
  - Exportación a CSV, Excel y PDF para Inspección de Trabajo
- **Recordatorios SMS**: Gestión completa del sistema de recordatorios SMS
  - Configuración del servicio (activar/desactivar, horarios, frecuencia)
  - Plantilla de mensaje personalizable con etiquetas dinámicas
  - Historial de SMS enviados con filtros por fecha, estado y trabajador
  - Dashboard con estado del proveedor, créditos y estadísticas
  - Opt-out individual por trabajador desde la edición del perfil

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
- La API de OpenJornada corriendo en `http://localhost:8080`

## Instalación

1. Instalar dependencias:

```bash
npm install
```

2. Configurar variables de entorno:

Copiar `.env.example` a `.env` y configurar:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME=OpenJornada
NEXT_PUBLIC_APP_LOGO=/logo.png
```

**Variables de entorno disponibles:**

- `NEXT_PUBLIC_API_URL`: URL de la API de OpenJornada (por defecto: `http://localhost:8080`)
- `NEXT_PUBLIC_APP_NAME`: Nombre de la aplicación que se muestra en la UI (por defecto: `OpenJornada`)
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
docker pull ghcr.io/openjornada/openjornada-admin:latest

# Versión específica
docker pull ghcr.io/openjornada/openjornada-admin:1.0.0
```

**Plataformas soportadas:** linux/amd64, linux/arm64

### Variables de Entorno en Docker

La imagen soporta dos tipos de variables:

#### Variables Runtime (configurables en docker-compose)

Estas variables se pueden cambiar **sin reconstruir la imagen**:

| Variable | Descripción | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL de la API | (requerida) |
| `NEXT_PUBLIC_APP_NAME` | Nombre de la aplicación | `OpenJornada` |
| `NEXT_PUBLIC_APP_LOGO` | Ruta al logo | `/logo.png` |

```yaml
# docker-compose.yml
services:
  admin:
    image: ghcr.io/openjornada/openjornada-admin:latest
    environment:
      - NEXT_PUBLIC_API_URL=https://mi-dominio.com/api
      - NEXT_PUBLIC_APP_NAME=Mi Empresa
      - NEXT_PUBLIC_APP_LOGO=/mi-logo.png
```

#### Variables Build-time (requieren reconstruir imagen)

Estas variables se configuran en **GitHub Actions** como repository variables:

| Variable | Descripción | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_BASE_PATH` | Path base para routing (ej: `/admin`) | `` (vacío) |

Para cambiar el `basePath`, actualiza la variable en GitHub → Settings → Secrets and variables → Actions → Variables, y ejecuta el workflow.

### Cómo funciona

La imagen usa un `docker-entrypoint.sh` que reemplaza placeholders con los valores de las variables de entorno al iniciar el contenedor. Esto permite usar la misma imagen en diferentes entornos.

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
- Runtime environment injection via docker-entrypoint.sh
- Auto-restart en caso de fallo

Para más detalles, ver [README.Docker.md](./README.Docker.md)

## Estructura del proyecto

```
openjornada-admin/
├── src/
│   ├── app/                 # Páginas de Next.js (App Router)
│   │   ├── login/           # Página de login
│   │   ├── workers/         # Gestión de trabajadores
│   │   │   ├── new/         # Crear trabajador
│   │   │   └── [id]/edit/   # Editar trabajador
│   │   ├── time-records/    # Visualización de registros
│   │   ├── reports/         # Informes y cumplimiento
│   │   │   ├── page.tsx     # Hub de informes
│   │   │   ├── workers/     # Informe mensual por trabajador
│   │   │   ├── companies/   # Informe mensual por empresa
│   │   │   └── signatures/  # Estado de firmas mensuales
│   │   ├── sms/            # Configuración y gestión de SMS
│   │   │   ├── page.tsx    # Configuración y plantilla
│   │   │   └── history/    # Historial de SMS enviados
│   │   ├── layout.tsx       # Layout principal
│   │   └── page.tsx         # Dashboard
│   ├── components/          # Componentes reutilizables
│   │   ├── reports/         # Componentes de informes
│   │   │   ├── StatCard.tsx        # Tarjeta KPI (default/warning/success)
│   │   │   ├── ReportFilters.tsx   # Filtros: empresa, año, mes, trabajador
│   │   │   └── ExportButtons.tsx   # Botones de exportación CSV/XLSX/PDF
│   │   ├── sms/                  # Componentes SMS
│   │   │   ├── SmsHistoryTable.tsx   # Tabla de historial
│   │   │   ├── SmsCreditsBadge.tsx   # Badge de créditos
│   │   │   └── SmsStatusBadge.tsx    # Badge de estado
│   │   ├── AppWrapper.tsx   # Wrapper con sidebar, topnav, footer
│   │   ├── Sidebar.tsx      # Barra lateral de navegación
│   │   ├── TopNav.tsx       # Barra superior
│   │   ├── Footer.tsx       # Pie de página
│   │   └── ProtectedRoute.tsx # HOC para rutas protegidas
│   ├── contexts/            # Contextos de React
│   │   └── AuthContext.tsx  # Context de autenticación
│   ├── utils/               # Utilidades
│   │   └── dateFormatters.ts # Formateo de fechas y zonas horarias
│   └── lib/                 # Configuración
│       ├── api-client.ts    # Cliente HTTP para la API
│       └── config.ts        # Configuración de la aplicación
├── public/                  # Archivos estáticos
├── .env.example             # Ejemplo de variables de entorno
└── package.json
```

## Autenticación

El sistema de autenticación funciona de la siguiente manera:

1. Usuario ingresa credenciales en `/login`
2. Se valida que el usuario tenga rol "admin" o "inspector"
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

El diseño utiliza los mismos colores que la landing page de OpenJornada:

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
- `GET /api/reports/monthly` - Informe mensual de empresa
- `GET /api/reports/monthly/worker/{id}` - Informe mensual de trabajador
- `GET /api/reports/export/monthly` - Exportar informe mensual (CSV/XLSX/PDF)
- `GET /api/reports/integrity/{id}` - Verificar integridad de un registro
- `GET /api/sms/credits` - Créditos y estado del proveedor
- `GET /api/sms/config` - Configuración SMS de la empresa
- `PATCH /api/sms/config` - Actualizar configuración SMS
- `GET /api/sms/template` - Plantilla de mensaje
- `PUT /api/sms/template` - Actualizar plantilla
- `POST /api/sms/template/reset` - Restaurar plantilla por defecto
- `GET /api/sms/stats` - Estadísticas de envío
- `GET /api/sms/history` - Historial de SMS
- `POST /api/workers/{id}/sms/send` - Enviar SMS a trabajador

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

## 👨‍💻 Autor

OpenJornada es un proyecto desarrollado por **[HappyAndroids](https://happyandroids.com)**.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor abre un issue antes de hacer cambios grandes.

## 🔗 Enlaces

- **Sitio web**: [www.openjornada.es](https://www.openjornada.es)
- **Desarrollado por**: [HappyAndroids](https://happyandroids.com)
- **Email**: info@openjornada.es

---

Un proyecto de [HappyAndroids](https://happyandroids.com) | [OpenJornada](https://www.openjornada.es)
