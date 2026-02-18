# Deploy su ZimaBlade con Tailscale

Guida per far girare **Gestione Progetti** su uno **ZimaBlade** a casa, raggiungibile da qualsiasi dispositivo con **Tailscale** (senza aprire porte sul router).

---

## Cosa ottieni

- **Database e app** girano sullo ZimaBlade.
- **Un solo indirizzo** per accedere: l’IP o il nome Tailscale dello ZimaBlade (es. `http://zimablade:3001` o `http://100.x.x.x:3001`).
- **Nessuna configurazione del router**: Tailscale crea una VPN tra i tuoi dispositivi; non serve port forwarding né IP pubblico.
- **Stesso database** per chiunque acceda da Tailscale (PC, altro portatile, tablet, ecc.).

---

## Prerequisiti

| Sul ZimaBlade | Note |
|---------------|------|
| **Sistema** | Linux (es. Ubuntu/Debian o immagine fornita per ZimaBlade). |
| **Tailscale** | Installato e fatto il login (`tailscale up`); il dispositivo deve essere nella tua tailnet. |
| **Node.js** | 18+ (per il backend). |
| **PostgreSQL** | 14+ oppure **Docker** per usare il `docker-compose.yml` del progetto. |
| **npm** | Incluso con Node. |

---

## 1. Tailscale sullo ZimaBlade

- Installa Tailscale sul dispositivo e fai il login (da documentazione Tailscale per il tuo OS).
- Annota **nome dispositivo** (es. `zimablade`) o **IP Tailscale** (100.x.x.x): sarà l’indirizzo per aprire l’app da PC/tablet/telefono con Tailscale.

Non serve aprire porte sul router di casa.

---

## 2. PostgreSQL sullo ZimaBlade

**Opzione A – Docker (consigliata)**

Dalla root del progetto sullo ZimaBlade:

```bash
docker compose up -d
```

Crea il database `gestione_progetti` con utente `postgres` / password `postgres` su `localhost:5432`.

**Opzione B – PostgreSQL installato a mano**

- Installa PostgreSQL, crea database e utente, annota host/porta/user/password.

---

## 3. Progetto sullo ZimaBlade

- Clona il repo (o copia la cartella del progetto) sullo ZimaBlade, es. in `/home/tuoutente/GestioneProgetti`.
- Oppure: sviluppi su PC, poi copi la cartella con `rsync`/scp quando vuoi aggiornare.

---

## 4. Configurazione backend

```bash
cd /path/to/GestioneProgetti/backend
cp .env.example .env
```

Modifica **`.env`**:

```env
# Se PostgreSQL è sullo stesso ZimaBlade (Docker o locale)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gestione_progetti?schema=public"

PORT=3001
NODE_ENV=production

# Opzionale: cartella upload (default: uploads)
UPLOADS_DIR=uploads
```

Se il DB fosse su un altro host nella tailnet, metteresti l’IP/hostname Tailscale al posto di `localhost`.

---

## 5. Build frontend e deploy backend

**Sullo ZimaBlade** (dalla root del progetto):

```bash
cd frontend
npm ci
npm run build
cp -r dist ../backend/client
cd ../backend
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
npm run build
```

- In `backend/client` finiscono i file statici del frontend; il backend in produzione li serve e risponde su una sola porta.

---

## 6. Avvio dell’applicazione

**Prova manuale:**

```bash
cd backend
node dist/index.js
```

L’app è in ascolto su tutte le interfacce (incluse quelle Tailscale). Da un altro dispositivo con Tailscale apri nel browser:

- `http://NOME-ZIMABLADE:3001` (es. `http://zimablade:3001`)  
  oppure  
- `http://100.x.x.x:3001` (IP Tailscale dello ZimaBlade)

**Avvio persistente (systemd, consigliato su Linux)**

Crea ad es. `/etc/systemd/system/gestione-progetti.service`:

```ini
[Unit]
Description=Gestione Progetti
After=network.target docker.service

[Service]
Type=simple
User=TUO_UTENTE
WorkingDirectory=/path/to/GestioneProgetti/backend
Environment=NODE_ENV=production
EnvironmentFile=/path/to/GestioneProgetti/backend/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Sostituisci `TUO_UTENTE` e i path. Poi:

```bash
sudo systemctl daemon-reload
sudo systemctl enable gestione-progetti
sudo systemctl start gestione-progetti
```

**Alternativa: pm2**

```bash
cd backend
npx pm2 start dist/index.js --name gestione-progetti
npx pm2 save
npx pm2 startup
```

---

## 7. Come ci si connette

- Su **PC/tablet/telefono** con Tailscale installato e nella stessa tailnet:
  - Apri il browser e vai a `http://NOME-ZIMABLADE:3001` (o `http://100.x.x.x:3001`).
- Il frontend e le API sono sullo stesso host, quindi non serve configurare URL aggiuntivi.
- I dati sono tutti sul database sullo ZimaBlade: un solo posto, condiviso da tutti i dispositivi che accedono via Tailscale.

---

## 8. Aggiornare l’app in seguito

Dopo aver modificato il codice (es. sul PC):

1. Copia/aggiorna il progetto sullo ZimaBlade (git pull o rsync).
2. Rifai build frontend e copia in `backend/client`, poi in `backend`: `npm ci --omit=dev`, `npx prisma migrate deploy` (se ci sono nuove migration), `npm run build`.
3. Riavvia il servizio: `sudo systemctl restart gestione-progetti` (o `pm2 restart gestione-progetti`).

---

## Riepilogo

| Cosa | Dove |
|------|------|
| Database | ZimaBlade (PostgreSQL in Docker o nativo) |
| Backend + frontend | ZimaBlade (Node, una porta, es. 3001) |
| Accesso | Da qualsiasi dispositivo con Tailscale → `http://zimablade:3001` (o IP Tailscale) |
| Router di casa | Nessuna configurazione necessaria |

Così hai tutto su un server tuo (ZimaBlade) e lo raggiungi sempre via Tailscale, con il database condiviso da chiunque usi l’app tramite quell’indirizzo.
