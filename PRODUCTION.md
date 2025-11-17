# Docker Compose Production Deployment Guide

## 📋 Prerequisites

- Docker and Docker Compose installed
- Production server with ports 80, 5000, 3306 available
- Domain name (optional, for production use)

## 🚀 Quick Start

### 1. Setup Environment Variables

```bash
# Copy example file
cp .env.prod.example .env.prod

# Edit with your production values
notepad .env.prod  # Windows
nano .env.prod     # Linux/Mac
```

### 2. Build and Start Services

```bash
# Build images and start containers
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 3. Access Application

- **Frontend**: http://your-server-ip:3000 (or http://your-domain.com:3000)
- **Backend API**: http://your-server-ip:5000
- **MySQL**: localhost:3306 (only accessible within Docker network)

## 🔧 Configuration

### Environment Variables (.env.prod)

```env
# MySQL
MYSQL_ROOT_PASSWORD=YourSecureRootPassword123!
MYSQL_DATABASE=waterlevel_db
MYSQL_USER=wateruser
MYSQL_PASSWORD=YourSecureUserPassword456!
MYSQL_PORT=3306

# Backend
BACKEND_PORT=5000

# Frontend
FRONTEND_PORT=3000
REACT_APP_API_URL=http://your-domain.com:5000
```

### For HTTPS with Reverse Proxy (Nginx/Caddy)

Update `REACT_APP_API_URL`:
```env
REACT_APP_API_URL=https://api.your-domain.com
```

## 📊 Database Initialization

The database is automatically initialized with the schema from `init-mysql.sql` on first run.

To import sample data:
```bash
docker exec -i waterdashboard-mysql-prod mysql -uroot -p$MYSQL_ROOT_PASSWORD waterlevel_db < data/waterlevel_observe_kolok.csv
```

## 🔄 Management Commands

### Stop Services
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod down
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod restart
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### Backup Database
```bash
docker exec waterdashboard-mysql-prod mysqldump -uroot -p$MYSQL_ROOT_PASSWORD waterlevel_db > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
docker exec -i waterdashboard-mysql-prod mysql -uroot -p$MYSQL_ROOT_PASSWORD waterlevel_db < backup_20241114.sql
```

## 🛡️ Security Best Practices

1. **Change Default Passwords**: Always use strong, unique passwords in production
2. **Use HTTPS**: Set up SSL/TLS with Let's Encrypt or similar
3. **Firewall**: Only expose necessary ports (80, 443)
4. **Regular Updates**: Keep Docker images and dependencies updated
5. **Backup**: Schedule regular database backups

## 📈 Performance Optimization

### MySQL Tuning
Add to docker-compose.prod.yml mysql service:
```yaml
command: >
  --max_connections=200
  --innodb_buffer_pool_size=1G
  --query_cache_type=1
  --query_cache_size=64M
```

### Serve Options
The frontend uses `serve` package which includes:
- Automatic gzip compression
- Cache headers for static assets
- SPA routing support
- Fast and lightweight

## 🔍 Monitoring

### Health Checks
All services have health checks configured:
- MySQL: Every 30s
- Backend: Every 30s
- Frontend: Every 30s

Check health status:
```bash
docker-compose -f docker-compose.prod.yml ps
```

### Resource Usage
```bash
docker stats waterdashboard-mysql-prod waterdashboard-backend-prod waterdashboard-frontend-prod
```

## 🆘 Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs [service-name]

# Check health
docker inspect --format='{{json .State.Health}}' waterdashboard-backend-prod
```

### Database connection issues
```bash
# Test MySQL connection
docker exec -it waterdashboard-mysql-prod mysql -uroot -p

# Check network
docker network inspect waterdashboard-network-prod
```

### Frontend can't connect to backend
1. Check `REACT_APP_API_URL` in .env.prod
2. Ensure backend is accessible from browser
3. Check CORS settings in backend

## 🌐 Production Deployment with Reverse Proxy

### Using Nginx (External - Recommended)

```nginx
# /etc/nginx/sites-available/waterdashboard
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL with Let's Encrypt
```bash
certbot --nginx -d your-domain.com
```

## 📝 Version Information

- Node.js: 18 Alpine
- MySQL: 8.0
- Serve: Latest (for static file serving)
- Docker Compose: 3.8+

## 🔗 Useful Links

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
