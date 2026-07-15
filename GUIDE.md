# Hosting Guide — Running CSS Battle on a College LAN

This guide explains how to run the CSS Battle platform on **one college computer (the "server")** so that participants on **other computers connect over the local network** (same Wi-Fi / LAN switch) using just a web browser.

Participants do **not** install anything. They only open a URL like `http://192.168.1.50:5173` in Chrome/Firefox/Edge.

---

## 1. How it works (the big picture)

The server machine runs three things:

| Component | Port | Purpose |
|---|---|---|
| PostgreSQL (via Docker) | `5432` | Stores users, challenges, submissions, leaderboard |
| Backend API (Express) | `4000` | Auth, challenges, submissions, scoring |
| Render service (Playwright) | `4001` | Renders submitted HTML/CSS in headless Chromium (auto-started by the backend) |
| Frontend (Vite) | `5173` | The web app participants open in their browser |

The frontend talks to the backend through a proxy, so **participants only ever need port `5173`**. Everything else stays on the server.

```
Participant laptop (browser)
        │  http://<SERVER-IP>:5173
        ▼
   ┌──────────────────────────────────────────┐
   │  SERVER COMPUTER                           │
   │  Frontend :5173 ──proxy──► Backend :4000   │
   │                          └► Render  :4001   │
   │                          └► Postgres:5432   │
   └──────────────────────────────────────────┘
```

---

## 2. Requirements on the SERVER computer

Install these **only on the server**:

1. **Node.js 20+** — https://nodejs.org (LTS)
2. **Docker Desktop** (for PostgreSQL) — https://www.docker.com/products/docker-desktop
   - Alternatively, a locally installed PostgreSQL 16 works too, but Docker is easiest.
3. **Git** (to clone the project) — or copy the project folder via USB.

Participants need **nothing** except a modern browser and being on the same network.

> **Network:** the server and all participant computers must be on the **same local network** (same router/switch/Wi-Fi). A wired connection to the server is recommended for stability.

---

## 3. One-time setup on the server

Open a terminal in the project root (`cssbattle/`) and run these once.

### 3.1 Install dependencies

```bash
npm install
```

### 3.2 Install the Playwright browser (needed for scoring)

```bash
npx playwright install chromium
```

On Linux you may also need system libraries:

```bash
npx playwright install-deps chromium
```

### 3.3 Start the database

```bash
docker compose up -d
```

This starts PostgreSQL on port `5432` with the defaults matching `.env`.

### 3.4 Create the backend environment file

Copy the example and edit it:

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set values. **Important for LAN hosting** — the `CORS_ORIGINS` line must include your server's LAN IP (you'll find the IP in Section 4):

```env
PORT=4000
RENDER_PORT=4001

# Add your server's LAN IP here so browsers on other machines are allowed.
# Example if your server IP is 192.168.1.50:
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://192.168.1.50:5173

# CHANGE THIS before the event — participants/others should not guess it.
ADMIN_PIN=choose-a-strong-pin

DATABASE_URL=postgresql://postgres:1234@localhost:5432/postgres
```

> Tip: for a quick internal event you can temporarily set `CORS_ORIGINS=*`, but prefer listing the real IP.

### 3.5 Create the database tables and seed sample data

```bash
npm run db:migrate -w backend
npm run db:seed -w backend
```

`db:seed` adds sample challenges and users so you can test immediately. You can manage/replace these later from the Admin panel.

---

## 4. Find the server's LAN IP address

Participants will connect using this IP.

- **Windows:** open Command Prompt → `ipconfig` → look for **IPv4 Address** (e.g. `192.168.1.50`).
- **macOS:** `ipconfig getifaddr en0` (Wi-Fi) or `ipconfig getifaddr en1`.
- **Linux:** `hostname -I` (first address).

Write it down. In this guide we'll assume it is **`192.168.1.50`** — replace it with yours everywhere.

> Recommended: ask IT for a **static/reserved IP** for the server so it doesn't change mid-event.

---

## 5. Make the app reachable from other computers

By default the dev servers may only listen on `localhost`. You must bind them to the network.

### 5.1 Start the backend (listens on all interfaces already)

In one terminal:

```bash
npm run dev:backend
```

The backend on `:4000` and the render service on `:4001` will start. Leave this running.

### 5.2 Start the frontend bound to the network

In a **second** terminal, start Vite with `--host` so it accepts connections from other machines:

```bash
npm run dev:frontend -- --host 0.0.0.0
```

Vite will print something like:

```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.50:5173/
```

The **Network** URL is what participants use.

> The frontend proxies `/api`, `/render`, `/diff`, `/uploads`, `/targets` to the backend automatically — participants never touch ports 4000/4001 directly.

### 5.3 Allow the ports through the server's firewall

If participants can't connect, the firewall is usually the cause.

- **Windows:** Allow **Node.js** through Windows Defender Firewall, or open inbound TCP port **5173** (Control Panel → Windows Defender Firewall → Advanced → Inbound Rules → New Rule → Port → 5173).
- **macOS:** System Settings → Network → Firewall → allow incoming connections for Node, or turn the firewall off on a trusted LAN.
- **Linux (ufw):** `sudo ufw allow 5173/tcp`

You only need to open **5173** for participants.

---

## 6. Test before the event

1. On the **server**, open `http://localhost:5173` — the app should load.
2. On a **participant computer**, open `http://192.168.1.50:5173` — it should load the same app.
3. Log in as a seeded participant, open a challenge, write some CSS, and submit. You should get a score. If scoring works, the render pipeline is healthy.
4. Open the Admin panel and log in with your `ADMIN_PIN` to confirm admin access.

---

## 7. Running the event

### Admin (you, on the server)
- Open the app → go to the **Admin** area → enter the `ADMIN_PIN`.
- Create/upload challenges, register participant names, start/pause/end rounds, and watch the live leaderboard.

### Participants (on their own computers)
Share these instructions with them:

1. Connect to the **same Wi-Fi / network** as the server.
2. Open a browser and go to: **`http://192.168.1.50:5173`** (use the real IP you found).
3. Select your **name** from the list and enter your **PIN** (if one was set).
4. Pick a challenge, write HTML + CSS in the editor, watch the live preview, and **Submit** to get scored.

> Print the URL on a whiteboard / slide so everyone can find it.

---

## 8. Shutting down

- Stop the frontend and backend terminals with `Ctrl + C`.
- Stop the database (data is preserved in a Docker volume):

  ```bash
  docker compose down
  ```

- To completely wipe all event data (⚠️ destroys submissions and users):

  ```bash
  docker compose down -v
  ```

  Only do this if you intentionally want a clean slate.

---

## 9. Troubleshooting

| Symptom | Likely cause & fix |
|---|---|
| Participants get "connection refused" / page won't load | Frontend not started with `--host`, or firewall blocking port `5173`. See §5.2 and §5.3. |
| Page loads but data fails / CORS errors in console | Server IP missing from `CORS_ORIGINS` in `backend/.env`. Add `http://<SERVER-IP>:5173`, then restart the backend. |
| Submissions fail / no score | Playwright browser not installed. Run `npx playwright install chromium` (and `install-deps` on Linux), then restart the backend. |
| "Cannot connect to database" | Docker not running or Postgres not up. Run `docker compose up -d` and confirm with `docker ps`. |
| IP changed and everyone got disconnected | The server got a new DHCP address. Use a reserved/static IP (see §4), update `CORS_ORIGINS`, restart backend + frontend. |
| Slow rendering under load | The render service is synchronous per request; on typical event hardware this is fine. Avoid running other heavy apps on the server during the event. |

---

## 10. Quick reference (server terminal cheat-sheet)

```bash
# One-time
npm install
npx playwright install chromium
docker compose up -d
cp backend/.env.example backend/.env      # then edit CORS_ORIGINS + ADMIN_PIN
npm run db:migrate -w backend
npm run db:seed -w backend

# Every time you host (two terminals)
npm run dev:backend
npm run dev:frontend -- --host 0.0.0.0

# Participants open:  http://<SERVER-IP>:5173
```
