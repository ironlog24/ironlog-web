import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/bits'
import { LEGAL_UPDATED, OPERATOR, legalIncomplete } from '@/lib/legal'
import { supabase } from '@/data/api'

function Shell({ title, children }: { title: string; children: ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="min-h-dvh pb-32 md:pb-16">
      <div className="pt-safe mx-auto max-w-3xl px-5 md:px-10">
        <div className="flex items-center justify-between py-5">
          <button onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))} className="glass grid h-11 w-11 place-items-center rounded-2xl" aria-label="Zurück">
            <ArrowLeft size={18} />
          </button>
          <Logo className="text-3xl" />
        </div>
        <h1 className="h-display mb-6 mt-4 text-6xl">{title}</h1>
        {legalIncomplete() && (
          <p className="mb-6 rounded-2xl border border-blaze/30 bg-blaze/10 p-4 text-sm text-blaze">
            Platzhalter: Die Angaben zum Betreiber sind noch nicht ausgefüllt.
          </p>
        )}
        <div className="legal space-y-4 text-[15px] leading-relaxed text-white/70 [&_a]:text-lime [&_a]:underline [&_b]:text-white [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:tracking-wide [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
        <div className="mt-10 flex gap-5 text-xs text-white/40">
          <Link to="/impressum" className="hover:text-lime">Impressum</Link>
          <Link to="/datenschutz" className="hover:text-lime">Datenschutz</Link>
        </div>
      </div>
    </div>
  )
}

const Address = () => (
  <p>
    {OPERATOR.name}
    <br />
    {OPERATOR.street}
    <br />
    {OPERATOR.city}
    <br />
    {OPERATOR.country}
  </p>
)

export function Impressum() {
  return (
    <Shell title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <Address />
      <h2>Kontakt</h2>
      <p>
        E-Mail: {OPERATOR.email}
        {OPERATOR.phone && (
          <>
            <br />
            Telefon: {OPERATOR.phone}
          </>
        )}
      </p>
      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <Address />
      <h2>Haftung für Inhalte</h2>
      <p>
        IRONLOG ist ein Hilfsmittel zum Protokollieren von Training und Ernährung. Die angezeigten Werte (z. B. Kalorienbedarf, geschätztes 1RM, Nährwerte aus Open Food Facts) sind Richtwerte ohne Gewähr und ersetzen keine
        ärztliche oder fachliche Beratung.
      </p>
      <h2>Bildnachweise</h2>
      <p>
        Übungsfotos: <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noreferrer">Free Exercise DB</a> (Public Domain), farblich bearbeitet. Stimmungsbilder:{' '}
        <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a> (Unsplash-Lizenz). Lebensmitteldaten: ©{' '}
        <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">Open Food Facts</a>-Mitwirkende, Open Database License (ODbL).
      </p>
    </Shell>
  )
}

export function Datenschutz() {
  const online = !!supabase
  return (
    <Shell title="Datenschutz">
      <p className="text-xs text-white/40">Stand: {LEGAL_UPDATED}</p>

      <h2>1. Verantwortlicher</h2>
      <Address />
      <p>E-Mail: {OPERATOR.email}</p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <ul>
        <li><b>Konto:</b> E-Mail-Adresse, Passwort (nur verschlüsselt gespeichert), Vorname.</li>
        <li><b>Trainingsdaten:</b> Trainings, Sätze, Gewichte, Wiederholungen, Pläne, eigene Übungen und hochgeladene Bilder.</li>
        <li><b>Ernährung:</b> Mahlzeiten, Mengen, Ernährungsziele und die Angaben, die du für die Bedarfsberechnung eingibst (Alter, Größe, Gewicht, Geschlecht, Aktivität).</li>
        <li><b>Körpergewicht:</b> Datum und Gewicht, wenn du es einträgst.</li>
        <li><b>Technische Daten:</b> Beim Aufruf der Seite verarbeiten die Server deine IP-Adresse, Datum/Uhrzeit und Browserinformationen, um die Seite auszuliefern.</li>
      </ul>
      <p>
        Gesundheitsbezogene Angaben (z. B. Körpergewicht, Ernährung) gibst du freiwillig ein. Mit dem Eintragen willigst du ein, dass sie für die Funktionen der App gespeichert werden (Art. 9 Abs. 2 lit. a DSGVO). Du kannst sie
        jederzeit löschen.
      </p>

      <h2>3. Zweck und Rechtsgrundlage</h2>
      <p>
        Wir verarbeiten die Daten ausschließlich, um dir die Funktionen von IRONLOG bereitzustellen: Konto, Speicherung und Synchronisation deiner Daten auf allen Geräten (Art. 6 Abs. 1 lit. b DSGVO). Die technischen
        Zugriffsdaten verarbeiten wir zur sicheren Auslieferung der Seite (Art. 6 Abs. 1 lit. f DSGVO). Es gibt <b>keine Werbung, kein Tracking und keine Analyse-Tools</b>.
      </p>

      <h2>4. Dienstleister (Auftragsverarbeiter)</h2>
      <ul>
        <li>
          <b>Cloudflare, Inc.</b> (USA) – Hosting und Auslieferung der Website (Cloudflare Pages, weltweites Netzwerk). Dabei werden technische Zugriffsdaten (z. B. IP-Adresse, Zeitpunkt, Browser) verarbeitet. Die
          Übermittlung in die USA stützt sich auf den EU-US Data Privacy Framework bzw. Standardvertragsklauseln.
        </li>
        {online && (
          <li>
            <b>Supabase, Inc.</b> – Konto-Verwaltung und Datenbank. Deine Daten liegen auf Servern in <b>Frankfurt am Main (EU)</b>. Mit Supabase besteht ein Vertrag zur Auftragsverarbeitung.
          </li>
        )}
        <li>
          <b>Open Food Facts</b> (Frankreich) – Wenn du online nach Lebensmitteln suchst oder einen Barcode abfragst, der nicht in der App enthalten ist, wird der Suchbegriff bzw. Barcode zusammen mit deiner IP-Adresse an
          Open Food Facts gesendet. Es werden dabei keine Kontodaten übertragen.
        </li>
        <li>
          <b>Unsplash</b> (USA) – Einige Hintergrundbilder werden von images.unsplash.com geladen; dabei wird deine IP-Adresse übertragen.
        </li>
      </ul>

      <h2>5. Speicherung im Browser</h2>
      <p>
        IRONLOG speichert technisch notwendige Daten im lokalen Speicher deines Browsers (localStorage), z. B. die Anmeldung, das laufende Training, Favoriten und zuletzt genutzte Lebensmittel. Es werden keine Cookies zu
        Werbe- oder Analysezwecken gesetzt (§ 25 Abs. 2 TDDDG).
      </p>

      <h2>6. Kamera</h2>
      <p>Für den Barcode-Scanner fragt der Browser nach Zugriff auf die Kamera. Das Bild wird nur auf deinem Gerät ausgewertet und nicht gespeichert oder übertragen.</p>

      <h2>7. Speicherdauer</h2>
      <p>Deine Daten bleiben gespeichert, bis du sie oder dein Konto löschst. Unter Einstellungen → „Konto löschen“ werden Konto und alle zugehörigen Daten sofort endgültig gelöscht.</p>

      <h2>8. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie das Recht, eine Einwilligung jederzeit zu widerrufen. Einen
        Export aller Daten findest du unter Einstellungen → „Meine Daten“. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, z. B. der Behörde deines Bundeslandes.
      </p>
    </Shell>
  )
}
