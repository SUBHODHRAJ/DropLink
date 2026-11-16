# DropLink – Production Deployment Guide

DropLink is designed for dual-mode operation:
1. **Local LAN Mode (AirDrop style):** Runs directly on your Windows laptop; mobile phones and peers connect through Wi-Fi with instant QR scanning, device PIN pairing, and streaming up to 100GB+.
2. **Global Internet Sharing Mode:** Hosted on a VPS or cloud server with persistent storage, HTTPS, and public token downloads.

---

## 1. Quick Windows Local Deployment
Simply double-click `Start-DropLink.bat` in the project root.
- Detects the local LAN IP (e.g. `192.168.1.100:5000`)
- Generates QR code and pairing PIN
- Connects to MySQL 8 on port 3306
- Launches your default browser to `http://localhost:5000`

---

## 2. Docker / Cloud Server Deployment (Ubuntu / Debian / AWS / DigitalOcean)

### Prerequisites:
- Docker & Docker Compose installed
- A public domain (e.g., `droplink.yourdomain.com`) pointing to your server's public IP
- SSL Certificate (Let's Encrypt / Certbot)

### Steps:
```bash
# 1. Clone repository
git clone https://github.com/your-username/DropLink.git
cd DropLink/deployment

# 2. Update environment credentials in docker-compose.yml
# Set your domain in StorageSettings__PublicDomain

# 3. Launch Docker containers
docker-compose up -d --build

# 4. Verify running containers
docker-compose ps
```

---

## 3. Reverse Proxy & NGINX HTTPS Configuration
```nginx
server {
    listen 80;
    server_name droplink.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name droplink.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/droplink.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/droplink.yourdomain.com/privkey.pem;

    client_max_body_size 150G;
    client_body_timeout 1800s;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $http_connection;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SignalR WebSockets
    location /hub/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
