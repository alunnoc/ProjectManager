# Prompt per generare il JSON del progetto (da dare all’AI)

Usa questo testo insieme al **documento di riassunto del progetto** (PDF, Word o testo). L’AI dovrà estrarre fasi, work package, date e deliverable (documenti e output) e restituire **solo** un JSON valido nel formato sotto.

---

## Istruzioni da incollare nell’AI

```
Analizza il seguente documento di riassunto del progetto e estrai tutte le informazioni strutturate indicate sotto.

Devi produrre un unico file JSON valido, senza commenti e senza testo prima/dopo, con questa struttura esatta:

{
  "projectName": "Nome del progetto (opzionale)",
  "t0": "YYYY-MM-DD",
  "phases": [
    {
      "name": "Nome della fase",
      "startDate": "T0 oppure T0+N unità oppure YYYY-MM-DD",
      "endDate": "T0 oppure T0+N unità oppure YYYY-MM-DD",
      "deliverables": [
        {
          "type": "document | block_diagram | prototype | report | other",
          "title": "Titolo",
          "description": "Descrizione (opzionale)",
          "dueDate": "T0 oppure T0+N unità oppure YYYY-MM-DD (opzionale)"
        }
      ]
    }
  ],
  "workPackages": [
    {
      "name": "Nome del work package",
      "phaseName": "Nome esatto della fase (deve coincidere con phases[].name)",
      "startDate": "T0 oppure T0+N unità oppure YYYY-MM-DD (opzionale)",
      "endDate": "T0 oppure T0+N unità oppure YYYY-MM-DD (opzionale)",
      "deliverables": [ ... ]
    }
  ]
}

**Data di inizio progetto (T0):**
- Inserisci "t0" (o "projectStartDate") con la data di inizio del progetto in formato YYYY-MM-DD.
- Tutte le date relative (vedi sotto) saranno calcolate a partire da questa data. Nell'applicazione l'utente potrà modificare il T0 e tutte le date relative verranno ricalcolate automaticamente.

**Date: formato assoluto o relativo**
Per startDate, endDate e dueDate puoi usare:
1. **Data assoluta**: "YYYY-MM-DD" (es. "2025-03-15").
2. **Data relativa a T0** (consigliato per progetti con T0):
   - "T0" = data di inizio progetto
   - "T0+3mesi" = T0 + 3 mesi (scrivi: mesi, mese, anni, anno, settimane, settimana, giorni, giorno)
   - "T0+1anno" = T0 + 1 anno
   - "T0+2settimane" = T0 + 2 settimane
   - "T0+15giorni" = T0 + 15 giorni
   Puoi inserire uno spazio: "T0 + 3 mesi".

Se il documento indica "la fase inizia 3 mesi dopo l'avvio" usa "T0+3mesi"; se indica una data precisa usa "YYYY-MM-DD".

**Regole per i deliverable:**
- "type" deve essere esattamente uno di: document, block_diagram, prototype, report, other.
- document = documenti, specifiche, manuali. block_diagram = diagrammi a blocchi, architetture. prototype = prototipi, mock-up. report = report di fase. other = altro.

Inserisci i deliverable in phases[].deliverables se generali alla fase; in workPackages[].deliverables se specifici del WP.

Rispondi SOLO con il JSON, nessun altro testo.
```

Poi incolla sotto il **contenuto del documento** (o il testo estratto dal PDF/Word).

---

## Esempio di JSON valido (con date relative T0)

```json
{
  "projectName": "Sistema di gestione ordini",
  "t0": "2025-02-01",
  "phases": [
    {
      "name": "Analisi",
      "startDate": "T0",
      "endDate": "T0+3mesi",
      "deliverables": [
        {
          "type": "document",
          "title": "Specifiche funzionali",
          "description": "Documento di specifica delle funzionalità"
        },
        {
          "type": "block_diagram",
          "title": "Architettura di sistema"
        }
      ]
    },
    {
      "name": "Sviluppo",
      "startDate": "T0+3mesi",
      "endDate": "T0+1anno",
      "deliverables": [
        {
          "type": "prototype",
          "title": "Prototipo interfaccia utente",
          "dueDate": "T0+6mesi"
        }
      ]
    }
  ],
  "workPackages": [
    {
      "name": "WP1 - Requisiti",
      "phaseName": "Analisi",
      "startDate": "T0",
      "endDate": "T0+2mesi",
      "deliverables": [
        {
          "type": "document",
          "title": "Documento requisiti utente",
          "dueDate": "T0+2mesi"
        }
      ]
    },
    {
      "name": "WP2 - Backend API",
      "phaseName": "Sviluppo",
      "deliverables": [
        {
          "type": "document",
          "title": "Specifica API REST"
        },
        {
          "type": "block_diagram",
          "title": "Flusso dati ordini"
        }
      ]
    }
  ]
}
```

---

## Uso nell’applicazione

1. Genera il JSON con l’AI (prompt + documento).
2. Salva l’output in un file `.json` (solo il JSON, senza markdown o spiegazioni).
3. Nella vista **Riepilogo** del progetto clicca **Importa da JSON** e seleziona il file.
4. L’app creerà fasi, work package e deliverable. Se nel JSON c’è **t0**, verrà impostata la data di inizio progetto.
5. **Modificare il T0:** nella sezione "Data inizio progetto (T0)" imposta la nuova data e clicca **Applica**. Tutte le date espresse come T0, T0+3mesi, ecc. verranno ricalcolate automaticamente.

**Nota:** Se ri-importi un file, le fasi e i WP già esistenti (stesso nome) vengono aggiornati; i deliverable vengono aggiunti. Per ripartire da zero usa "Resetta fasi e WP".
