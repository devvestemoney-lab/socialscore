# ZamCredit — aaPanel Deployment

Target: single VPS, nginx serves the frontend static build, reverse-proxies `/api` to the Node API on port **3001**, PostgreSQL local.

## 1. Server prerequisites (one-time)

In aaPanel:
- **App Store → Node.js Version Manager** → install Node **20+** (22 recommended)
- **App Store → PostgreSQL Manager** (or Databases → PostgreSQL) → ensure PG is running
- **App Store → PM2 Manager** → install

SSH in and install pnpm:

```bash
npm i -g pnpm
```

## 2. Database

Create DB + user (via aaPanel PG manager, or psql):

```sql
CREATE USER zamcredit WITH PASSWORD 'CHANGE_ME_STRONG';
CREATE DATABASE zamcredit OWNER zamcredit;
```

## 3. Deploy the code

```bash
cd /www/wwwroot
# upload zamcredit.zip here (aaPanel Files) then:
unzip zamcredit.zip -d zamcredit && cd zamcredit/Credit-Platform-Enterprise

pnpm install
pnpm approve-builds        # approve esbuild when prompted

# Build everything needed (skips mockup-sandbox which is Replit-only)
PORT=3001 BASE_PATH=/ pnpm --filter '!@workspace/mockup-sandbox' -r --if-present run build
```

## 4. Environment

```bash
cat > /www/wwwroot/zamcredit/Credit-Platform-Enterprise/artifacts/api-server/.env <<'EOF'
DATABASE_URL=postgresql://zamcredit:CHANGE_ME_STRONG@127.0.0.1:5432/zamcredit
JWT_SECRET=REPLACE_WITH_LONG_RANDOM_STRING
PORT=3001
NODE_ENV=production
EOF
```

Generate a JWT secret: `openssl rand -hex 32`

## 5. Schema + seed

```bash
cd /www/wwwroot/zamcredit/Credit-Platform-Enterprise
export DATABASE_URL="postgresql://zamcredit:CHANGE_ME_STRONG@127.0.0.1:5432/zamcredit"
pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts run seed
```

Seed is idempotent — it skips if users already exist.

## 6. Run under PM2

```bash
cd /www/wwwroot/zamcredit/Credit-Platform-Enterprise/artifacts/api-server
pm2 start dist/index.mjs --name zamcredit-api \
  --node-args="--enable-source-maps --env-file=.env"
pm2 save
pm2 startup   # run the command it prints, once
```

Check: `curl http://127.0.0.1:3001/api/healthz` → `{"status":"ok"}`

(If your Node is <20.6 and `--env-file` is unsupported, export the vars in the shell before `pm2 start`, or use a PM2 ecosystem file.)

## 7. Nginx site (aaPanel)

Create a site in aaPanel (e.g. `credit.yourdomain.com` or bind a port on 102.23.120.197), then replace the location blocks in the site's nginx config with:

```nginx
server {
    listen 80;                      # or your chosen dedicated port
    server_name credit.yourdomain.com;

    root /www/wwwroot/zamcredit/Credit-Platform-Enterprise/artifacts/credit-platform/dist/public;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~* \.(js|css|png|svg|ico|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

Reload nginx from aaPanel. Add SSL via the site's SSL tab (Let's Encrypt) once a domain points at the server.

## 8. Verify

- Open the site → login page loads
- Login `zanaco@zamcredit.zm` / `zanaco123`
- Lookup NRC `12/345678/67` → score ~905 (Excellent)
- Super admin: `admin@zamcredit.zm` / `admin123`
- Customer portal: `customer@zamcredit.zm` / `customer123`

## Before going anywhere near production

- Change ALL seeded passwords (they're in `replit.md` and `scripts/src/seed.ts`)
- Rotate `JWT_SECRET`, use a strong DB password
- Lock CORS down: `app.use(cors())` in `artifacts/api-server/src/app.ts` is wide open — restrict `origin` to your domain
- HTTPS only
- The bank/MNO/MFI connectors are deterministic mocks — real integrations replace `artifacts/api-server/src/lib/` generators

## Updating after code changes

```bash
cd /www/wwwroot/zamcredit/Credit-Platform-Enterprise
PORT=3001 BASE_PATH=/ pnpm --filter '!@workspace/mockup-sandbox' -r --if-present run build
pm2 restart zamcredit-api
```
