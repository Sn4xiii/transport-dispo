# Projekt-Entscheidungen

## Architektur
- Frontend: React + Vite
- Backend: Supabase (self-hosted)
- Auth: Invite-only
- Mandantenfähig: Ja (Multi-Tenant)

## Grundprinzipien
- Jeder Datensatz gehört zu genau einem Mandanten (`tenant_id`)
- Kein direkter Zugriff auf `auth.users`
- Edge Functions nur, wenn zwingend nötig
- Server ist Source of Truth

## Nicht-Ziele (vorerst)
- Kein öffentliches Signup
- Keine externe API
- Kein komplexes RBAC