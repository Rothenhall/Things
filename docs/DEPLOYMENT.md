# Deployment: keep the collector running and reachable

The collector must be running, and your visitors' browsers must be able to reach it over **https**, for the chat and tracking to work on a live site. This guide covers every common way to do that, from a free tunnel on your own computer to a small server. Pick one section in [Choose where it runs](#choose-where-it-runs), then read [Keep it running](#keep-it-running), [HTTPS and the dashboard](#https-reverse-proxy-and-the-dashboard), [Backups and retention](#backups-and-retention) and [Hardening](#hardening-checklist).

Throughout, replace `things.example.com` with your own address.

## What needs to be reachable

| Thing | Who reaches it | Must be public? |
|---|---|---|
| Widget files (`things-chat.js` and two more) | visitors' browsers | yes: from your site, a CDN, or the collector's `/things/` |
| `POST /api/chat`, `POST /api/track` on the collector | visitors' browsers | yes, over https (a page served over https cannot call plain http) |
| `/admin` dashboard | you | **no**: keep it private (see below) |
| Content files and log files | the collector only | never |

If the collector is down, your site keeps working. The character says it cannot reach its brain, and AI-referral records for that period are lost.

## Choose where it runs

| Option | Cost | Stable address | Good for | Caveat |
|---|---|---|---|---|
| [Your own computer + Cloudflare quick tunnel](#your-own-computer--cloudflare-tunnel) | free | no (changes each run) | trying it out | computer must be on |
| [Your own computer + Cloudflare named tunnel](#named-cloudflare-tunnel-stable-address) | free (needs a domain on Cloudflare) | yes | a small live site | computer must be on and awake |
| [Your own computer + Tailscale Funnel](#tailscale-funnel) | free for personal use | yes (`*.ts.net`) | a small live site | computer must be on |
| [A small server (VPS)](#a-small-server-vps) | a few dollars a month | yes | anything serious | you maintain it |
| [Docker](#docker) | depends | yes | servers you already containerise | image below is untested in CI |
| [All-in-one Next.js app](#all-in-one-the-nextjs-app) | depends | yes | studio, landing, chat and dashboard together | needs a host with a real disk, not serverless |

Serverless hosts (Vercel, Netlify, Cloudflare Pages Functions) are **not** suitable for the collector: their file systems are read-only or temporary, so logs would be lost. You can host your *site* there and run the collector elsewhere.

### Your own computer + Cloudflare tunnel

1. Start the collector: `npx @rothenhall/things collector`
2. Install `cloudflared` (https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) and run:

   ```bash
   cloudflared tunnel --url http://localhost:8787
   ```

3. It prints an address like `https://random-words.trycloudflare.com`. Use it as `data-endpoint`.

The address changes every time you restart the tunnel, so this is for testing. For a stable address use a named tunnel.

### Named Cloudflare tunnel (stable address)

Requires a domain whose DNS is on Cloudflare.

```bash
cloudflared tunnel login
cloudflared tunnel create things
cloudflared tunnel route dns things things.example.com
```

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: things
credentials-file: /home/you/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: things.example.com
    service: http://localhost:8787
  - service: http_status:404
```

Run it with `cloudflared tunnel run things`, and install it as a service (`cloudflared service install`) so it starts at boot. See Cloudflare's documentation for your operating system.

### Tailscale Funnel

```bash
tailscale funnel 8787
```

Gives a stable `https://<machine>.<tailnet>.ts.net` address. Funnel must be enabled for your tailnet (Tailscale admin console, Access Controls).

### A small server (VPS)

Any Linux server with Node.js 20.12 or newer works; 512 MB of memory is plenty.

```bash
# on the server, as a normal user
mkdir things && cd things
npm init -y
npm install @rothenhall/things
npx things init --site-url https://example.com --endpoint https://things.example.com --no-chat   # or leave --no-chat off
# edit things.env and things-content/, then:
npx things doctor
```

Then keep it running ([pm2](#pm2) or [systemd](#systemd)) and put https in front ([Caddy or nginx](#https-reverse-proxy-and-the-dashboard)). Open ports 80 and 443 only; the collector itself can listen on `127.0.0.1` (`COLLECTOR_HOST=127.0.0.1`).

Copy your `things-content/` and `things.env` to the server (never commit `things.env`). Content changes are picked up without a restart.

### Docker

The repository's `Dockerfile` and `docker-compose.yml` run the all-in-one Next.js app (studio, landing page, chat and dashboard on one origin). To run **only the collector** from the npm package you can use a stock Node image:

```bash
docker run -d --name things --restart unless-stopped \
  -p 127.0.0.1:8787:8787 \
  -v "$PWD":/app -w /app \
  node:22-alpine npx --yes @rothenhall/things collector
```

with `things.env`, `things-content/` and `things-data/` in the current folder (they are read and written there, so the data survives container restarts). This command has not been run in this project's CI; if it does not work for you please open an issue.

### All-in-one: the Next.js app

Runs the studio, the landing page, the chat and the dashboard on one server and one origin.

```bash
git clone https://github.com/Rothenhall/Things.git && cd things
cp .env.example .env              # set ADMIN_TOKEN, SITE_URL, ALLOWED_ORIGINS
docker compose up -d --build      # or: npm ci && npm run build && npm start
```

Everything in [SELF_HOSTING.md](SELF_HOSTING.md) applies. Crawler detection runs in the app's middleware; when your *site* runs elsewhere, set `COLLECTOR_URL` on it so hits are sent here.

## Keep it running

### pm2

```bash
npm install -g pm2
cd /path/to/your/project
pm2 start "npx things collector" --name things
pm2 save
pm2 startup           # prints a command to run once so it starts at boot
pm2 logs things
```

### systemd

`/etc/systemd/system/things.service`:

```ini
[Unit]
Description=Things collector
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=things
WorkingDirectory=/srv/things
ExecStart=/usr/bin/npx things collector
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/srv/things/things-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now things
sudo journalctl -u things -f
```

Check the path to `npx` with `which npx`. The `ReadWritePaths` line must match your `DATA_DIR`.

### Windows

Run the collector in a terminal for testing. To keep it running after logout or reboot use one of:

- **pm2** (works on Windows): `npm install -g pm2`, `pm2 start "npx things collector" --name things`, then `pm2 save` and a startup tool such as `pm2-installer`.
- **Task Scheduler**: create a task that runs at startup, action `cmd.exe`, arguments `/c npx things collector`, "Start in" set to your project folder, "Run whether user is logged on or not".
- **NSSM** (https://nssm.cc): `nssm install Things "C:\Program Files\nodejs\npx.cmd" things collector`, then set the startup directory to your project folder.

A laptop that sleeps stops answering; set the power plan to never sleep while plugged in, or use a server.

### macOS

Use pm2, or a `launchd` agent in `~/Library/LaunchAgents/com.example.things.plist` with `ProgramArguments` `["/usr/local/bin/npx","things","collector"]`, `WorkingDirectory` set to your project and `KeepAlive` true.

## HTTPS, reverse proxy and the dashboard

Browsers refuse to let an https page call an http collector, so put https in front of it. Tunnels (Cloudflare, Tailscale) already provide it. On a server use Caddy or nginx.

### Caddy (automatic certificates)

`/etc/caddy/Caddyfile`:

```
things.example.com {
    reverse_proxy 127.0.0.1:8787
}
```

### nginx

```nginx
server {
    listen 443 ssl http2;
    server_name things.example.com;
    # ssl_certificate and ssl_certificate_key from certbot / your provider

    client_max_body_size 32k;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Pass `X-Forwarded-For` so rate limits count real visitors instead of your proxy's address.

### Reaching the dashboard

By default the dashboard is **local only**: the collector refuses `/admin` for any request that carries a proxy header (`X-Forwarded-For`, `CF-Connecting-IP`, `X-Real-IP`, `Forwarded`). Tunnels and reverse proxies add those headers, so `https://things.example.com/admin` will answer 403 while the chat works. That is deliberate: it keeps your question log private even if someone guesses the address. You have three ways in:

| Way | How |
|---|---|
| **On the machine itself** | Open `http://localhost:8787/admin`. |
| **SSH tunnel** (server) | `ssh -L 8787:127.0.0.1:8787 you@server`, then open `http://localhost:8787/admin` on your computer. |
| **Allow it over https** | Set `ADMIN_LOCAL_ONLY=false` in `things.env` and restart. Only do this with https in front, a long random `ADMIN_TOKEN`, and ideally an extra layer (a Cloudflare Access policy, a VPN, or an IP allow-list in nginx: `location /admin { allow 203.0.113.7; deny all; proxy_pass ...; }`). |

## Setting `ALLOWED_ORIGINS`

List every origin that embeds the widget, exactly as the browser shows it:

```
ALLOWED_ORIGINS=https://example.com,https://www.example.com
```

A page on `https://www.example.com` is a different origin from `https://example.com`. During local development add `http://localhost:3000` (or your dev port). Restart after changing it.

## Your site on a different host

| Your site is on | Collector runs on | What to do |
|---|---|---|
| anything | your computer or a VPS | Put the tag on your pages with `data-endpoint` set to the collector's https address. |
| Vercel / Netlify | a VPS or tunnel | Same. Serve `/things/*.js` from your site's `public/`, or use the collector's `/things/` URL. |
| WordPress, Shopify, Webflow, Squarespace, Wix | a VPS or tunnel | Use the collector's `/things/things-chat.js` URL in the tag. See [FRAMEWORKS.md](FRAMEWORKS.md). |

To also see **crawler** traffic (crawlers do not run JavaScript, so the widget cannot see them) add a server-side hook: the Cloudflare Worker, your Next.js middleware, or the access-log importer. See [GETTING_STARTED.md](GETTING_STARTED.md#step-10-capture-ai-crawler-traffic).

## Backups and retention

All state is the folder named by `DATA_DIR` (default `things-data/`) plus your content and settings.

```bash
# nightly backup, keeps 30 days (add to crontab -e)
0 3 * * * tar czf /backups/things-$(date +\%F).tgz -C /srv/things things-data things-content things.env && find /backups -name 'things-*.tgz' -mtime +30 -delete
```

Back up `things.env` somewhere private: it holds your dashboard password and any API key.

- Each log rotates once it passes `LOG_MAX_MB` (default 10 MB): the current file becomes `<name>.1`, replacing any earlier `.1`. If you want to keep history longer, copy the `.1` files out regularly or raise `LOG_MAX_MB`.
- To delete data, stop the collector and delete the file (`questions.jsonl`, `bot-hits.jsonl`, `visits.jsonl`, and their `.1` copies). See [DATA_AND_PRIVACY.md](DATA_AND_PRIVACY.md).
- To move to a new machine, copy the folder and `things.env`, install, and start. There is nothing to migrate.

## Monitoring

- `GET /api/health` returns `{"ok":true,...,"pages":N}`; point an uptime monitor at it and alert when it fails or when `pages` is `0`.
- `npx things doctor --endpoint https://things.example.com` is a one-shot check you can run from cron or a deploy script (exit code 1 on problems).
- The collector prints warnings at start-up when `ALLOWED_ORIGINS` is empty or no content was found.
- Watch your model spend in your provider's dashboard as well as `CHAT_DAILY_LLM_LIMIT`; the limit is per process and resets on restart.

## Upgrading

```bash
npm update @rothenhall/things
npx things update            # refresh the copied widget files
sudo systemctl restart things   # or: pm2 restart things
npx things doctor
```

## Hardening checklist

- [ ] `ADMIN_TOKEN` is at least 24 random characters (`npx things token`) and `things.env` is not in git
- [ ] `ALLOWED_ORIGINS` lists only your sites
- [ ] https in front of the collector; the collector bound to `127.0.0.1` if a proxy is on the same machine
- [ ] `/admin` not reachable from the internet, or protected by an extra layer
- [ ] `CHAT_DAILY_LLM_LIMIT` set to something you are comfortable paying for, and a spending limit set at your model provider
- [ ] `DATA_DIR` and `CONTENT_DIR` outside any folder your web server serves
- [ ] The collector runs as an unprivileged user
- [ ] Backups work (restore one to check)
- [ ] Your privacy policy mentions the chat ([DATA_AND_PRIVACY.md](DATA_AND_PRIVACY.md))

## Scale and limits

One Node process, plain files, in-memory rate limits. That comfortably handles a typical small-business site. If you expect heavy traffic: put the widget files on a CDN, keep `CHAT_RATE_LIMIT` modest, and expect the log files to grow (rotation keeps only one old copy). Running several collector processes against one folder is not supported: their rate limits would not be shared.
