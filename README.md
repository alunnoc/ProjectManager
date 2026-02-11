# Gestione Progetti - Project Management Tool

Applicazione gestionale moderna con board Kanban, diario giornaliero, calendario, configurazione per progetto e ricerca full-text.

## Struttura del progetto

```
GestioneProgetti/
├── backend/           # Node.js + Express + Prisma
├── frontend/         # React + TypeScript + Tailwind
├── avvia-app.bat     # Avvio backend + frontend con un doppio clic (Windows)
└── README.md
```

## Requisiti

- **Node.js** 18+
- **PostgreSQL** 14+ (in esecuzione)
- **npm** (o pnpm)

## Avvio con un click (Windows)

1. Assicurati che **PostgreSQL** sia avviato (servizio Windows o `docker compose up -d` se usi Docker).
2. **Doppio clic** su **`avvia-app.bat`** nella root del progetto.
3. Si aprono due finestre: una per il backend (porta 3001), una per il frontend (porta 5173).
4. Attendi qualche secondo, poi apri il browser su **http://localhost:5173**.
5. Per fermare l’app: chiudi le due finestre CMD (o premi Ctrl+C in ciascuna).

**Prima volta:** in ciascuna cartella (`backend` e `frontend`) esegui una volta `npm install`. In `backend` copia `.env.example` in `.env`, imposta `DATABASE_URL` e lancia `npx prisma migrate deploy`.

---

## Avvio manuale (da terminale)

### 1. Database (PostgreSQL)

**Opzione A – Docker**  
Dalla root del progetto:
```bash
docker compose up -d
```
In `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gestione_progetti?schema=public"
```

**Opzione B – PostgreSQL installato**  
Servizio avviato, database `gestione_progetti` esistente. In `backend/.env` imposta `DATABASE_URL` con user e password corretti.

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # Configurare DATABASE_URL
npx prisma migrate deploy
npm run dev
```
Server: **http://localhost:3001**

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
App: **http://localhost:5173**

---

## Dove sono salvati i dati

- **Database PostgreSQL**  
  Progetti, colonne, task, commenti, allegati (riferimenti), resoconti del diario, sezioni di configurazione e link sono salvati nel database `gestione_progetti`.

- **File su disco**  
  Le **immagini** caricate (allegati ai task e al diario) sono salvate nella cartella **`backend/uploads`**. Nel database viene memorizzato solo il percorso del file.

### I dati si mantengono quando:

| Cosa fai | I dati restano? |
|----------|------------------|
| Chiudi il browser | Sì |
| Fermi il backend (Ctrl+C) | Sì (il database continua a girare) |
| Riavvii backend e frontend | Sì |
| Riavvii il PC | Sì, se PostgreSQL si avvia (servizio o Docker) |

I dati si perdono solo se cancelli il database, la cartella `backend/uploads`, o reinstalli PostgreSQL senza conservare i dati.

---

## Funzionalità

- **Board Kanban**: colonne personalizzabili, drag & drop dei task, commenti e allegati immagini sui task, eliminazione task.
- **Diario**: resoconti giornalieri con testo, immagini e commenti.
- **Calendario**: vista mensile con giorni che hanno resoconti evidenziati; clic su un giorno per vedere i resoconti.
- **Configurazione**: sezioni per progetto (Risorse e link, Repository, Documentazione, Altro). In ogni sezione puoi aggiungere link o solo nomi (es. repository interno).
- **Riepilogo**: analytics, scadenze task, fasi, work package e **deliverable** (documenti/block diagram/prototipi per fase e WP). **Importa da JSON**: carica un file JSON generato da un’AI per creare in automatico fasi, WP e deliverable (vedi `docs/PROMPT_AI_JSON_PROGETTO.md`).
- **Ricerca globale**: full-text su task, commenti, resoconti e nomi immagini (dalla barra in alto).
- **Progetti**: creazione, eliminazione, evidenziazione del progetto attivo nella sidebar. Dark mode (icona luna/sole in header).

---

## Accedere da telefono (stessa rete Wi-Fi)

Per usare l'app dallo smartphone sulla **stessa rete Wi-Fi** del PC:

1. **Avvia l'app sul PC** (con `avvia-app.bat` o da terminale). Backend e frontend devono essere in esecuzione.
2. **Trova l'indirizzo IP del PC**: in PowerShell o CMD esegui `ipconfig` e cerca l'**IPv4** della scheda Wi-Fi/LAN (es. `192.168.1.10`).
3. **Sul telefono**: stesso Wi-Fi del PC, apri il browser e vai a `http://IP_DEL_PC:5173` (es. **http://192.168.1.10:5173**).
4. **Se non si carica**: verifica stessa rete; in Windows potrebbe servire consentire le porte **5173** e **3001** nel Firewall per reti private.

Il frontend è configurato con `vite --host` quindi è in ascolto sulla rete locale; le richieste dal telefono passano dal frontend al backend tramite il proxy Vite sul PC.

---

## Repository Git / GitHub

Il progetto è sotto Git. Per salvare il codice su GitHub:

1. **Crea un nuovo repository** su [github.com](https://github.com) (New repository). Scegli un nome, es. `GestioneProgetti`, e **non** inizializzare con README (il repo è già pronto in locale).

2. **Collega il repository remoto e invia il codice** (dalla root del progetto):
   ```bash
   git remote add origin https://github.com/TUO-USERNAME/GestioneProgetti.git
   git branch -M main
   git push -u origin main
   ```
   Sostituisci `TUO-USERNAME` con il tuo username GitHub e `GestioneProgetti` con il nome del repo se diverso.

3. **In seguito**, per salvare modifiche:
   ```bash
   git add .
   git commit -m "Descrizione delle modifiche"
   git push
   ```

---

## Note

- Il frontend in sviluppo usa il proxy Vite verso `/api` e `/uploads`, quindi deve girare insieme al backend per funzionare.
- Per problemi al primo avvio (es. “table does not exist”): in `backend` esegui `npx prisma migrate deploy` e, se serve, `npx prisma generate` (a backend fermo).
