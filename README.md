# Transport Disposition

Multi-Tenant Transport-Disposition-System.

## Ziel
Ein internes Web-Tool zur Verwaltung von Transporten für mehrere Mandanten.

## Stack
- Frontend: React + Vite
- Backend: Supabase (self-hosted, Docker)
- Auth: Invite-only
- Hosting: Ubuntu VM

## Architektur-Prinzipien
- Server ist die einzige Quelle der Wahrheit
- Jeder Datensatz gehört zu genau einem Mandanten
- Erst Minimalfunktionalität, dann Erweiterung
- Keine unnötige Komplexität am Anfang

## Projektstatus
Initiale Projektstruktur.  
Backend & Frontend folgen nach VM-Setup.
