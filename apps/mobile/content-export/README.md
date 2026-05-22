# Health explorations content export

**File:** `health-explorations-content.xlsx`

Spreadsheet export of all health exploration content from `prototype.html` (the Kind web app prototype).

## Sheets

| Sheet | Contents |
|-------|----------|
| **README** | How to use this file |
| **Explorations** | Core fields per exploration (title, description, duration, participants, etc.) |
| **List_cards** | Short copy on the Exploration tab list |
| **Protocol_phases** | Protocol timeline steps |
| **Expected_outcomes** | Outcome bullets (available explorations) |
| **KPIs** | Dashboard metrics (active morning-rules exploration) |
| **Chart_data** | Chart bars (morning-rules energy chart) |
| **Log_fields** | Daily log form fields and options |
| **Coming_soon** | Treatment exploration (UI only, not in app data yet) |
| **Researcher_explorations** | Researcher profile links to explorations |

## Regenerate

From `apps/mobile`:

```bash
npm run export:explorations
```

## After editing

Share the updated `.xlsx` back and we can import your changes into `prototype.html`.
