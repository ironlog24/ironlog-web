# IRONLOG – Gym Tracker

Premium-Gym-Tracker (Mobile First, Desktop mit Sidebar), komplett auf Deutsch, Einheit kg.

**Stack:** React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui-Muster (Radix + CVA) · Framer Motion · Recharts · lucide-react · Supabase (Auth, Postgres mit RLS, Storage) · PWA (vite-plugin-pwa)

## Schnellstart

```bash
npm install
npm run dev          # http://localhost:5173
```

Ohne `.env` läuft IRONLOG im **Demo-Modus**: Login mit beliebigen Daten, alles wird im `localStorage` gespeichert. Neue Konten starten ohne Trainings (Fortschritt bei 0) und mit den Vorlagen Push/Pull/Leg Day. `demoHistory()` in `seed.ts` erzeugt bei Bedarf Beispieldaten.

## Supabase anbinden

1. Projekt auf supabase.com anlegen.
2. Im **SQL Editor** nacheinander ausführen:
   - `supabase/migrations/0001_ironlog.sql` – Tabellen `profiles`, `exercises`, `workouts`, `workout_exercises`, `sets`, `templates`, RLS-Policies, Profil-Trigger, Storage-Bucket `exercise-images`
   - `supabase/migrations/0002_seed_exercises.sql` – 52 vorbefüllte Übungen (global, `user_id = NULL`)
3. `.env.example` nach `.env` kopieren und `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` eintragen.
4. Optional unter *Authentication → Providers → Email* die E-Mail-Bestätigung an/aus schalten.

Beim ersten Login werden automatisch die Vorlagen *Push Day*, *Pull Day* und *Leg Day* angelegt.

### Sicherheit (RLS)

- Jede Tabelle hat Row Level Security; Nutzer sehen und ändern nur Zeilen mit `user_id = auth.uid()`.
- `workout_exercises` und `sets` prüfen zusätzlich, dass das Eltern-Objekt dem Nutzer gehört.
- Globale Übungen sind für alle lesbar, aber nicht änderbar.
- Storage: Upload nur in den eigenen Ordner `<user_id>/…`.

## Build & Deployment

```bash
npm run build        # dist/ inkl. Service Worker + Manifest (installierbar)
npm run preview
```

Auf Vercel/Netlify deployen und SPA-Fallback auf `index.html` setzen. `npx vite build --mode artifact` erzeugt zusätzlich eine einzelne HTML-Datei (Hash-Routing, ohne Service Worker) für Demos.

## Struktur

```
src/
  data/       types, seed (Übungen, Vorlagen, Demo-Historie), api (Supabase + Demo), stats (PRs, 1RM, Volumen, Streak)
  state/      store.tsx – Daten-Context + aktives Training (persistiert, überlebt Reload)
  components/ AppShell (Bottom-Nav / Sidebar), Img (Lazy, Blur-Placeholder, Duotone, Fallback), RestTimer, ui/*
  pages/      Landing, Auth, Dashboard, Training (Live), Recap, Library, ExerciseDetail, History, Progress, Templates
  lib/        images.ts (alle Unsplash-Motive zentral), utils, confetti
```

## Bilder

Übungsfotos: je Übung ein echtes Foto der Bewegung aus der [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (Public Domain), mitgeliefert in `src/assets/exercises/<übungs-id>.jpg`. Austauschen = Datei mit gleicher ID ersetzen.

Stimmungsbilder (Hero, Muskelgruppen, Pläne):

Alle Fotos kommen von Unsplash (Unsplash-Lizenz) und sind in `src/lib/images.ts` zentral gepflegt. Austauschen = ID ändern. Lädt ein Bild nicht, zeigt `Img` ein generiertes Ersatzmotiv im IRONLOG-Stil.

## Logik-Details

- **1RM:** Epley, `w × (1 + r/30)`; bei Körpergewichtsübungen zählen Wiederholungen.
- **PR:** Ein Satz ist ein PR, wenn sein geschätztes 1RM den bisherigen Bestwert der Übung übertrifft (erste Sitzung einer Übung zählt nicht).
- **Streak:** aufeinanderfolgende Kalenderwochen mit mindestens einem Training.
- **Muskelverteilung:** Anzahl Sätze je Muskelgruppe (fairer als kg).
