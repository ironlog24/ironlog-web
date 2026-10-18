/**
 * Angaben für Impressum und Datenschutzerklärung.
 * ▸ HIER deine echten Daten eintragen (Pflicht nach § 5 DDG, sobald andere die App nutzen).
 *   Solange etwas mit "[" beginnt, zeigt die Seite einen Hinweis, dass Angaben fehlen.
 */
export const OPERATOR = {
  name: 'Jousef Abdul-Khalek',
  street: 'Mühlweg 36',
  city: '71334 Waiblingen',
  country: 'Deutschland',
  email: 'ironlog24.app@gmail.com',
  phone: '', // optional
}

export const LEGAL_UPDATED = '16.10.2026'

export const legalIncomplete = () => Object.values(OPERATOR).some((v) => typeof v === 'string' && v.startsWith('['))
