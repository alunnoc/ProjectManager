# Deploy su server aziendale

Guida per installare **Gestione Progetti** su un server in azienda (Linux o Windows Server), in modo che sia raggiungibile da tutti i PC della rete (es. `http://server-azienda:3001`).

---

## Cosa serve sul server

| Componente   | Versione   | Note |
|-------------|------------|------|
| **Node.js** | 18 o superiore | Per eseguire il backend |
| **PostgreSQL** | 14+ | Database (può essere sullo stesso server o su un altro) |
| **npm**      | (incluso con Node) | Per installare dipendenze e build |

Opzionale: **nginx** (o altro reverse proxy) per mettere HTTPS davanti all’app e/o usare una porta 80/443.

---

## Architettura in produzione

In produzione l’app gira su **una sola porta** (es. 3001):

- Il **backend Node** risponde su quella porta.
- Le richieste a **`/api`** e **`/uploads`** vanno al backend.
- Tutto il resto (pagine, JS, CSS) è servito dal backend come **file statici** (build del frontend React).

Quindi non serve avviare il frontend separatamente: dopo la build, il backend serve anche l’interfaccia.

---

## Passi per il deploy

### 1. Preparare il database PostgreSQL

Sul server (o su un altro host dedicato) deve esserci PostgreSQL con un database dedicato.

**Opzione A – PostgreSQL già installato**

- Crea un database, ad es. `gestione_progetti`.
- Crea un utente con password e concedi i permessi su quel database.
- Annota: host, porta (di solito 5432), nome database, utente, password.

**Opzione B – PostgreSQL con Docker**

Sulla macchina dove girerà l’app (o su un server dedicato):

```bash
# Dalla root del progetto
docker compose up -d
```

Questo avvia PostgreSQL (porta 5432) con utente `postgres`, password `postgres`, database `gestione_progetti`. Adatta user/password se necessario (variabili in `docker-compose.yml`).

---

### 2. Copiare il progetto sul server

Esempi:

- **Git**: `git clone <url-repo> GestioneProgetti && cd GestioneProgetti`
- Oppure copia della cartella del progetto (zip, rsync, ecc.) e poi `cd GestioneProgetti`.

---

### 3. Configurare il backend

```bash
cd backend
cp .env.example .env
```

Modifica **`.env`** con i dati reali:

```env
# Database (sostituisci con i dati del tuo PostgreSQL)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/gestione_progetti?schema=public"

# Porta su cui ascolta l’app (default 3001)
PORT=3001

# Obbligatorio in produzione
NODE_ENV=production
```

- Se il DB è sulla stessa macchina: `HOST` = `localhost`.
- Se il DB è su un altro server: metti l’IP o il nome host del server PostgreSQL.

---

### 4. Build del frontend e copia in backend

Il frontend va **costruito** e i file vanno messi nella cartella **`backend/client`** (il backend in produzione serve da lì).

**Su Linux/macOS** (dalla root del progetto):

```bash
cd frontend
npm ci
npm run build
cp -r dist ../backend/client
cd ../backend
```

**Su Windows** (PowerShell, dalla root del progetto):

```powershell
cd frontend
npm ci
npm run build
xcopy /E /I dist ..\backend\client
cd ..\backend
```

In questo modo in `backend/client` avrai `index.html` e la cartella `assets/` (JS/CSS). Non committare `backend/client` (è già in `.gitignore`).

---

### 5. Installare dipendenze e migrare il database (backend)

Sempre nella cartella **`backend`**:

```bash
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
```

- `npm ci --omit=dev` installa solo le dipendenze necessarie in produzione.
- `prisma migrate deploy` crea/aggiorna le tabelle nel database.

---

### 6. Avviare l’applicazione

**Avvio diretto** (per prova o uso leggero):

```bash
cd backend
node dist/index.js
```

Oppure, se hai usato `npm run build` prima:

```bash
npm run start
```

L’app è in ascolto su `http://0.0.0.0:3001` (o sulla porta che hai messo in `PORT`). Da un altro PC della rete: `http://IP-DEL-SERVER:3001`.

**Avvio in background (consigliato)**

Per tenere l’app sempre attiva e riavviarla in caso di crash o dopo un riavvio del server:

- **Linux (systemd)** – crea un file di servizio, es. `/etc/systemd/system/gestione-progetti.service`:

```ini
[Unit]
Description=Gestione Progetti
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/GestioneProgetti/backend
Environment=NODE_ENV=production
EnvironmentFile=/path/to/GestioneProgetti/backend/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Poi:

```bash
sudo systemctl daemon-reload
sudo systemctl enable gestione-progetti
sudo systemctl start gestione-progetti
sudo systemctl status gestione-progetti
```

- **pm2** (Linux o Windows):

```bash
cd backend
npx pm2 start dist/index.js --name gestione-progetti
npx pm2 save
npx pm2 startup   # opzionale: avvio automatico al boot
```

Sostituisci `/path/to/GestioneProgetti` e l’utente con i valori reali del tuo server.

---

### 7. Firewall e rete

- Apri la **porta 3001** (o quella in `PORT`) sul firewall del server, almeno per la rete aziendale.
- Se usi un reverse proxy (nginx) su porta 80/443, apri quelle porte e configura il proxy verso `http://127.0.0.1:3001`.

---

### 8. (Opzionale) Reverse proxy con nginx e HTTPS

Se vuoi usare un dominio (es. `gestione.azienda.it`) e HTTPS:

1. Installa nginx e un certificato (es. Let’s Encrypt).
2. Configura un virtual host che:
   - riceve le richieste su 443 (HTTPS);
   - inoltra a `http://127.0.0.1:3001` (proxy pass per tutto, oppure per `/` e `/api` e `/uploads`).

Esempio minimo nginx (da adattare a dominio e path certificati):

```nginx
server {
    listen 443 ssl;
    server_name gestione.azienda.it;
    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

In questo caso gli utenti useranno `https://gestione.azienda.it` e non devono ricordare la porta.

---

### 9. Cartella uploads e backup

- Le **immagini** caricate (allegati task, diario) sono salvate in **`backend/uploads`**.  
  Assicurati che quella cartella esista e che il processo Node possa scriverci (permessi utente del servizio).
- Includi **`backend/uploads`** e il **database PostgreSQL** nei backup aziendali.

---

### 10. Aggiornare l’app in seguito

Dopo aver preso le ultime modifiche dal repository (es. `git pull`):

```bash
# Root del progetto
cd frontend
npm ci
npm run build
cp -r dist ../backend/client    # Linux/macOS
# oppure: xcopy /E /I dist ..\backend\client   # Windows

cd ../backend
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
```

Poi riavvia il backend (es. `sudo systemctl restart gestione-progetti` o `pm2 restart gestione-progetti`).

---

## Riepilogo comandi (Linux, dalla root)

```bash
# Build e deploy
cd frontend && npm ci && npm run build && cp -r dist ../backend/client && cd ../backend
npm ci --omit=dev && npx prisma generate && npx prisma migrate deploy

# Avvio
node dist/index.js
# oppure con pm2: pm2 start dist/index.js --name gestione-progetti
```

---

## Risoluzione problemi

| Problema | Controllo |
|----------|-----------|
| "Cannot find module" | In `backend`: `npx prisma generate` e `npm run build` (o `npm ci` e poi `npm run build`). |
| "connect ECONNREFUSED" al DB | PostgreSQL avviato? `DATABASE_URL` in `.env` corretta? Firewall che blocca la porta 5432? |
| Pagina bianca / 404 | Verifica che esista `backend/client/index.html` (build frontend copiata in `backend/client`). |
| Immagini non si vedono | Controlla che la cartella `backend/uploads` esista e che il processo Node abbia permessi di lettura. |

Se l’app in sviluppo funziona (locale), in produzione verifica sempre: `NODE_ENV=production`, `DATABASE_URL` giusta, build frontend in `backend/client`, porta aperta e servizio avviato.
