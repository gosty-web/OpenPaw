# Deployment

Because OpenPaw is designed as a secure, local-first platform, most users run it directly on their desktop. However, you can choose to run OpenPaw continuously on a VPS (Virtual Private Server), home server (like a Raspberry Pi or unRAID box), or cloud provider.

## Prerequisites
- A remote Linux server with at least 1GB of RAM. (2GB+ Recommended).
- Node.js v20.x installed.
- SSH access.

## Standard Installation (Linux)

Log in to your server and clone OpenPaw:

```bash
git clone https://github.com/YOUR_USERNAME/openpaw.git ~/.openpaw-install
cd ~/.openpaw-install
./install.sh
```

Execute the first-time onboarding to configure the initial properties:

```bash
openpaw
```
Generate your secure web token and save it. Exit the process (`CTRL+C`) once it spins up.

## Running with PM2 (Production)

We highly recommend running the OpenPaw server through a process manager like **PM2** on headless machines to ensure it survives restarts.

Install PM2 globally:
```bash
npm install -g pm2
```

Start the OpenPaw instances using the run scripts:
```bash
# Start backend
cd ~/.openpaw-install/server
pm2 start "npm run dev" --name "openpaw-server"

# Start frontend optionally (or serve statically via Nginx)
cd ~/.openpaw-install/client
pm2 start "npm run dev" --name "openpaw-client"
```

Save your process list to start OpenPaw on reboot:
```bash
pm2 save
pm2 startup
```

## Reverse Proxying with Nginx

If accessing the dashboard remotely, you must secure the web traffic via a Reverse Proxy like Nginx using an SSL certificate (Let's Encrypt).

1. Install Nginx.
2. Direct incoming traffic on port `80` (or `443` for HTTPS) to your Vite client running on port `5173`.
3. Proxy backend API requests (e.g. `domain.com/api`) to the backend running on port `7411`.

```nginx
server {
    listen 80;
    server_name mybot.domain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:7411;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade; # Required for Socket.io
        proxy_set_header Connection "upgrade";
    }
}
```

Since OpenPaw strictly uses the 32-byte Auth Token generated at boot, your web-ui is secure against unauthorized visitors accessing the dashboard. Ensure you only access the dashboard remotely over HTTPS to keep the token encrypted in transit.
