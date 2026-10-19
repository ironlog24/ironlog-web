# IRONLOG – Projektwissen für Claude

Diese Datei fasst zusammen, was bisher besprochen und gebaut wurde. Claude Code liest sie zu Beginn jeder Sitzung automatisch.
Sprache mit dem Nutzer: **Deutsch**, einfache Schritt-für-Schritt-Anleitungen (Nutzer ist Azubi Fachinformatiker Systemintegration, kein Profi-Entwickler, hat **keinen Mac**, nutzt Windows + iPhone + Apple Watch).

## Überblick
- **IRONLOG**: Gym-Tracker als Web-App/PWA. Dunkles Design (#0A0A0A, Lime #C6FF00, Orange #FF5F1F, Bebas Neue + Inter), deutsche Oberfläche, kg.
- Live: https://ironlog-youssef.netlify.app
- Repo: `ironlog24/ironlog-web` (public). **App-Code liegt im Unterordner `ironlog-web-teil-1/`.**
- Watch-Recorder (Swift, eigenes Repo `ironlog24/ironlog-recorder`, privat).

## Technik
- React 18 + TypeScript + Vite 5, Tailwind 3, Radix Dialog, framer-motion, recharts, lucide-react, vite-plugin-pwa.
- Backend: **Supabase** (Projekt `jjxwcmemkwchbdwszifo`, Region Frankfurt). Auth E-Mail/Passwort, alle Tabellen mit RLS `user_id = auth.uid()`.
  - Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key, darf öffentlich sein).
  - Ohne Env-Variablen läuft die App im **Demo-Modus** (localStorage, Login ohne Prüfung).
  - Migrationen: `ironlog-web-teil-1/supabase/migrations/0001…0006`. Der Nutzer führt neue SQL-Dateien selbst im Supabase SQL Editor aus → immer idempotent schreiben (`if not exists`, `drop policy if exists`) und am Ende `notify pgrst, 'reload schema';`. Neue Tabellen brauchen explizite `grant`s für `authenticated`.
- Build-Modi: `npm run build` (normal, PWA). `vite build --mode artifact` erzeugt eine Single-File-HTML (MemoryRouter, ohne Service Worker).

## Deployment (wichtig)
- **Netlify baut NICHT selbst** (Gratis-Tarif blockt Commits von „claude“ als „Unrecognized Git contributor“).
- Stattdessen: **GitHub Action `.github/workflows/deploy.yml`** baut bei jedem Push auf `main` und lädt per `netlify-cli deploy --prod` hoch.
  - Secrets: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`. Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Netlify-Guthaben ist knapp → Änderungen bündeln, nicht jede Kleinigkeit einzeln pushen.
- Vor jedem Push: `cd ironlog-web-teil-1 && npm ci && npm run build` muss fehlerfrei laufen.

## Bereits gebaut
- Screens: Landing, Login/Registrierung (+ Passwort vergessen), Dashboard, Live-Training, Recap, Übungsbibliothek (52 Übungen, eigene Fotos in `src/assets/exercises`), Übungsdetail, Verlauf, Fortschritt, Pläne (Push/Pull/Legs-Cover, Muskelgruppen-Filter), Ernährung.
- **Kalorientracker**: ~145.000 deutsche Produkte (Open Food Facts, ODbL) als `src/assets/foods.dat`, ~130 Grundnahrungsmittel, Online-Suche, Barcode-Scanner (Kamera, nur https), Ziele-Rechner.
- **Einstellungen**: Profil, Pausenzeit, Passwort ändern, Datenexport (JSON/CSV), Konto löschen (RPC `delete_my_account`).
- **Impressum/Datenschutz** (`src/lib/legal.ts`, Betreiber eingetragen, E-Mail ironlog24.app@gmail.com).
- **Körpergewicht** mit Diagramm (Fortschritt).
- **Offline-Modus**: Trainings werden ohne Netz gespeichert und später hochgeladen; Cache der letzten Daten.
- **Gewichtsvorschlag** (doppelte Progression) im Training.
- **Buddys** (Version 1): Einladungscode/-link `/i/CODE`, Buddy-Karte auf Dashboard, Respekt 🔥, Wochen-Challenge (wechselt Konstanz/Steigerung), Duo-Streak, Story-Karten 1080×1920 mit QR (PR, Ergebnis, Streak, „Schlag mich“), Sichtbarkeit. Tabellen: `friendships`, `workout_summaries`, `reactions`; RPCs `accept_invite`, `my_buddies`, `invite_info`.
- **Avatar** (`src/components/Avatar.tsx`): wächst mit Anzahl Trainings, Proportionen nach Muskelgruppen der letzten 6 Wochen, 15 Level, „Skip Leg Day 🍗“-Hinweis.
  - **Avatar-Erstellung nach dem Login** (`AvatarOnboarding` in `App.tsx`): Typ, Körperbau, Hautton, Frisur, Haarfarbe, Bart. Gespeichert in `profiles.avatar` (jsonb) + localStorage.
  - **Avatar-Fortschrittskarte im Recap** (`AvatarProgress` in `Recap.tsx`).
  - Migration `0006_avatar.sql` (Spalte `profiles.avatar`).
- **Neue Übungsfotos** mit wenig Grün (`src/assets/exercises`, gleiche Dateinamen).

## Ideen / offene Punkte
- Buddys Version 2: Anstupsen per Push, Monats-Recap im „Wrapped“-Stil, animierte Karten, WhatsApp-Linkvorschau.
- **„Gym Wars“**: eigenes Gym gegen andere Gyms der Stadt (Punkte, Ranglisten) – Wachstumsidee Nr. 1.
- Avatar als teilbare Story-Karte.
- Eigene Domain, E-Mail-Versand über Brevo (Supabase SMTP), Impressums-Adresse statt Wohnadresse vor öffentlichem Launch.
- Apple-Watch-Erkennung: Recorder-App sammelt Bewegungsdaten (30–50 Sätze pro Übung), danach eigenes Klassifikationsmodell (Core ML). Build über GitHub Actions + TestFlight; Apple Developer Account steht noch aus.
- Später: Abo (Stripe/App Store), Login mit Google/Apple.
