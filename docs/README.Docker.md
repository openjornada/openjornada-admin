# OpenJornada Admin - Docker Production Setup

This document explains how to build and run the OpenJornada Admin panel in production using Docker.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

## Quick Start

### 1. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.production.example .env.production
```

Edit `.env.production` with your production values:

```env
NEXT_PUBLIC_API_URL=http://your-api-domain.com
NEXT_PUBLIC_APP_NAME=OpenJornada
NEXT_PUBLIC_APP_LOGO=/logo.png
```

### 2. Build and Run

#### Option A: Using Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f admin

# Stop the container
docker-compose -f docker-compose.prod.yml down
```

#### Option B: Using Docker directly

```bash
# Build the image
docker build -t openjornada-admin:latest .

# Run the container
docker run -d \
  --name openjornada-admin \
  -p 3001:3001 \
  -e NEXT_PUBLIC_API_URL=http://your-api-domain.com \
  -e NEXT_PUBLIC_APP_NAME=OpenJornada \
  -e NEXT_PUBLIC_APP_LOGO=/logo.png \
  --restart unless-stopped \
  openjornada-admin:latest

# View logs
docker logs -f openjornada-admin

# Stop the container
docker stop openjornada-admin
docker rm openjornada-admin
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | URL of the OpenJornada API | `http://localhost:8000` | Yes |
| `NEXT_PUBLIC_APP_NAME` | Application name | `OpenJornada` | No |
| `NEXT_PUBLIC_APP_LOGO` | Path to logo image | `/logo.png` | No |

### Port Configuration

By default, the admin panel runs on port **3001**. You can change this in `docker-compose.prod.yml`:

```yaml
ports:
  - "8080:3001"  # Maps host port 8080 to container port 3001
```

## Production Deployment

### With Reverse Proxy (Nginx/Traefik)

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name admin.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Docker Compose with API

To run the entire stack together, create a `docker-compose.full.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  api:
    build:
      context: ../openjornada-api
      dockerfile: docker/prod/Dockerfile
    ports:
      - "8000:8000"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=time_tracking_db
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - mongodb
    restart: unless-stopped

  admin:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:8000
      - NEXT_PUBLIC_APP_NAME=OpenJornada
    depends_on:
      - api
    restart: unless-stopped

volumes:
  mongodb_data:
```

## Healthcheck

The container includes a healthcheck that verifies the Next.js server is responding. Check the health status:

```bash
docker inspect --format='{{json .State.Health}}' openjornada-admin
```

## Troubleshooting

### Container fails to start

Check logs:
```bash
docker-compose -f docker-compose.prod.yml logs admin
```

### Cannot connect to API

1. Verify `NEXT_PUBLIC_API_URL` is set correctly
2. Ensure the API is accessible from the container
3. Check network configuration if using Docker networks

### Build fails

1. Ensure you have Node.js 20+ for local testing
2. Check that `package.json` and `package-lock.json` are present
3. Verify you have enough disk space

### Port already in use

Change the host port in `docker-compose.prod.yml`:
```yaml
ports:
  - "3002:3001"  # Use port 3002 instead
```

## Maintenance

### Update the container

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

### View resource usage

```bash
docker stats openjornada-admin
```

### Access container shell

```bash
docker exec -it openjornada-admin sh
```

## Performance Optimization

### Multi-stage builds

The Dockerfile uses multi-stage builds to minimize image size:
- Builder stage: ~1GB
- Final image: ~200MB

### Standalone mode

Next.js standalone mode is enabled in `next.config.ts`, which includes only necessary dependencies in the final image.

### Resource limits

Add resource limits in `docker-compose.prod.yml`:

```yaml
services:
  admin:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Security

### Non-root user

The container runs as a non-root user (`nextjs`) for security.

### Environment variables

Never commit `.env.production` files. Use Docker secrets or environment variable management tools in production.

### HTTPS

Always use HTTPS in production. Configure SSL/TLS at the reverse proxy level (Nginx, Traefik, etc.).

## Additional Resources

- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [OpenJornada Documentation](../README.md)
