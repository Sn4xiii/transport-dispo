# Sicherheitsregeln

- Kein Zugriff auf auth.users aus dem Frontend
- Jede Query filtert implizit nach tenant_id
- Admin-Aktionen nur über Edge Functions
- .env Dateien niemals committen
- Keine Service Keys im Frontend