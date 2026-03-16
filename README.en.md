> 🇪🇸 [Leer en español](README.md)

# OpenJornada Admin

Web administration panel for OpenJornada - A work time tracking and management system.

## Features

- **Secure authentication**: Only users with the "admin" role can access the panel
- **Worker management**: Full CRUD for workers
  - Create new workers
  - Edit worker information
  - Delete workers (soft delete)
- **Time record viewing**: View all clock-in/clock-out records with date filters
- **Dashboard**: Statistics and quick access to main features
- **Reports and compliance**: Monthly reports, export (CSV/XLSX/PDF) and signatures
  - Monthly report per worker with daily breakdown
  - Monthly report per company with worker summary
  - Monthly signature status for workers
  - Export to CSV, Excel, and PDF for Labor Inspection (required by Spanish labor law: art. 34.9 Workers' Statute and RD-Ley 8/2019)
- **SMS reminders**: Full SMS reminder system management
  - Service configuration (enable/disable, schedules, frequency)
  - Customizable message template with dynamic tags
  - SMS history with filters by date, status, and worker
  - Dashboard with provider status, credits, and statistics
  - Individual opt-out per worker from the profile editor

## Technologies

- Next.js 15.3.0 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4.1.9
- Axios for API communication
- React Hot Toast for notifications

## Prerequisites

- Node.js 18+
- npm or yarn
- The OpenJornada API running at `http://localhost:8080`

## Installation

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

Copy `.env.example` to `.env` and configure:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME=OpenJornada
NEXT_PUBLIC_APP_LOGO=/logo.png
```

**Available environment variables:**

- `NEXT_PUBLIC_API_URL`: OpenJornada API URL (default: `http://localhost:8080`)
- `NEXT_PUBLIC_APP_NAME`: Application name displayed in the UI (default: `OpenJornada`)
- `NEXT_PUBLIC_APP_LOGO`: Path to the application logo (default: `/logo.png`). Must be placed in the `public/` folder

3. Run in development mode:

```bash
npm run dev
```

The application will be available at `http://localhost:3001`

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm start` - Start the application in production mode
- `npm run lint` - Run the linter

## 🐳 Docker Image

The official image is available on GitHub Container Registry:

```bash
# Latest version
docker pull ghcr.io/openjornada/openjornada-admin:latest

# Specific version
docker pull ghcr.io/openjornada/openjornada-admin:1.0.0
```

**Supported platforms:** linux/amd64, linux/arm64

### Docker Environment Variables

The image supports two types of variables:

#### Runtime Variables (configurable in docker-compose)

These variables can be changed **without rebuilding the image**:

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | API URL | (required) |
| `NEXT_PUBLIC_APP_NAME` | Application name | `OpenJornada` |
| `NEXT_PUBLIC_APP_LOGO` | Logo path | `/logo.png` |

```yaml
# docker-compose.yml
services:
  admin:
    image: ghcr.io/openjornada/openjornada-admin:latest
    environment:
      - NEXT_PUBLIC_API_URL=https://my-domain.com/api
      - NEXT_PUBLIC_APP_NAME=My Company
      - NEXT_PUBLIC_APP_LOGO=/my-logo.png
```

#### Build-time Variables (require rebuilding the image)

These variables are configured in **GitHub Actions** as repository variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_BASE_PATH` | Base path for routing (e.g., `/admin`) | `` (empty) |

To change the `basePath`, update the variable in GitHub → Settings → Secrets and variables → Actions → Variables, and run the workflow.

### How It Works

The image uses a `docker-entrypoint.sh` that replaces placeholders with environment variable values when the container starts. This allows using the same image across different environments.

## Docker Deployment

To deploy in production with Docker:

```bash
# Set up environment variables
cp .env.production.example .env.production
# Edit .env.production with your values

# Build and run
docker-compose -f docker-compose.prod.yml up -d
```

**Docker features:**
- Multi-stage build to optimize image size (~200MB)
- Next.js standalone mode enabled
- Non-root user for security
- Runtime environment injection via docker-entrypoint.sh
- Auto-restart on failure

For more details, see [README.Docker.md](./README.Docker.md)

## Project Structure

```
openjornada-admin/
├── src/
│   ├── app/                 # Next.js pages (App Router)
│   │   ├── login/           # Login page
│   │   ├── workers/         # Worker management
│   │   │   ├── new/         # Create worker
│   │   │   └── [id]/edit/   # Edit worker
│   │   ├── time-records/    # Time record viewing
│   │   ├── reports/         # Reports and compliance
│   │   │   ├── page.tsx     # Reports hub
│   │   │   ├── workers/     # Monthly report per worker
│   │   │   ├── companies/   # Monthly report per company
│   │   │   └── signatures/  # Monthly signature status
│   │   ├── sms/            # SMS configuration and management
│   │   │   ├── page.tsx    # Configuration and template
│   │   │   └── history/    # SMS history
│   │   ├── layout.tsx       # Main layout
│   │   └── page.tsx         # Dashboard
│   ├── components/          # Reusable components
│   │   ├── reports/         # Report components
│   │   │   ├── StatCard.tsx        # KPI card (default/warning/success)
│   │   │   ├── ReportFilters.tsx   # Filters: company, year, month, worker
│   │   │   └── ExportButtons.tsx   # Export buttons CSV/XLSX/PDF
│   │   ├── sms/                  # SMS components
│   │   │   ├── SmsHistoryTable.tsx   # History table
│   │   │   ├── SmsCreditsBadge.tsx   # Credits badge
│   │   │   └── SmsStatusBadge.tsx    # Status badge
│   │   ├── AppWrapper.tsx   # Wrapper with sidebar, topnav, footer
│   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   ├── TopNav.tsx       # Top navigation bar
│   │   ├── Footer.tsx       # Footer
│   │   └── ProtectedRoute.tsx # HOC for protected routes
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx  # Authentication context
│   ├── utils/               # Utilities
│   │   └── dateFormatters.ts # Date formatting and timezone handling
│   └── lib/                 # Configuration
│       ├── api-client.ts    # HTTP client for the API
│       └── config.ts        # Application configuration
├── public/                  # Static files
├── .env.example             # Environment variables example
└── package.json
```

## Authentication

The authentication system works as follows:

1. User enters credentials at `/login`
2. The system validates that the user has the "admin" or "inspector" role
3. The JWT token is stored in localStorage
4. All routes (except /login) are protected
5. The token is automatically included in all API requests
6. If the token expires, the user is automatically redirected to /login

## Customization

### Branding

You can customize the application name and logo through environment variables:

1. **Change the application name:**
   ```bash
   NEXT_PUBLIC_APP_NAME="My System"
   ```
   This will change the name in:
   - Sidebar
   - Login page
   - Dashboard
   - Footer
   - Browser title

2. **Change the logo:**
   ```bash
   NEXT_PUBLIC_APP_LOGO="/my-logo.png"
   ```
   - Place your logo in the project's `public/` folder
   - The logo will be displayed in the sidebar and login page
   - Recommended size: 64x64px for login, 32x32px for sidebar

### Theme Colors

The design uses the same colors as the OpenJornada landing page:

- **Accent**: Green (`oklch(0.65 0.2 150)`)
- Light and dark mode support
- CSS variables for easy customization in `src/app/globals.css`

## API Endpoints Used

- `POST /api/token` - Authentication
- `GET /api/users/me` - Get current user
- `GET /api/workers/` - List workers
- `POST /api/workers/` - Create worker
- `GET /api/workers/{id}` - Get worker
- `PUT /api/workers/{id}` - Update worker
- `DELETE /api/workers/{id}` - Delete worker (soft delete)
- `GET /api/time-records/` - List time records
- `GET /api/time-records/worker/{id}` - Time records by worker
- `GET /api/reports/monthly` - Company monthly report
- `GET /api/reports/monthly/worker/{id}` - Worker monthly report
- `GET /api/reports/export/monthly` - Export monthly report (CSV/XLSX/PDF)
- `GET /api/reports/integrity/{id}` - Verify record integrity
- `GET /api/sms/credits` - Provider credits and status
- `GET /api/sms/config` - Company SMS configuration
- `PATCH /api/sms/config` - Update SMS configuration
- `GET /api/sms/template` - Message template
- `PUT /api/sms/template` - Update template
- `POST /api/sms/template/reset` - Restore default template
- `GET /api/sms/stats` - Sending statistics
- `GET /api/sms/history` - SMS history
- `POST /api/workers/{id}/sms/send` - Send SMS to worker

## Development

### Adding a New Page

1. Create a file at `src/app/new-route/page.tsx`
2. Use `AppWrapper` to include the layout
3. The route will be automatically protected

### Adding an API Endpoint

1. Add a method in `src/lib/api-client.ts`
2. Use in components: `await apiClient.newMethod()`

## 📄 License

GNU Affero General Public License v3.0 (AGPL-3.0) - See the LICENSE file in the project root.

## 👨‍💻 Author

OpenJornada is a project developed by **[HappyAndroids](https://happyandroids.com)**.

## 🤝 Contributing

Contributions are welcome. Please open an issue before making large changes.

## 🔗 Links

- **Website**: [www.openjornada.es](https://www.openjornada.es)
- **Developed by**: [HappyAndroids](https://happyandroids.com)
- **Email**: info@openjornada.es

---

A project by [HappyAndroids](https://happyandroids.com) | [OpenJornada](https://www.openjornada.es)
