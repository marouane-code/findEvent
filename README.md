# FindEvent — MVP

Mini-projet : plateforme d’événements géolocalisés + messagerie temps réel.

Structure
- backend: Node.js + TypeScript (Express, Socket.IO)
- frontend: React + TypeScript (Vite)
- db: SQL schema for MySQL (phpMyAdmin import)

Quick start (Windows, no Docker)
1. Configure database via phpMyAdmin and import `db/schema.sql`.
2. Backend
```powershell
cd backend
npm install
copy .env.example .env
# edit .env then:
npm run dev
```
3. Frontend
```powershell
cd frontend
npm install
npm run dev
```

Notes
- Add your `GOOGLE_MAPS_API_KEY` to the backend `.env` and frontend client when integrating the map.
- Auth uses JWT; passwords hashed with bcrypt.

XAMPP / phpMyAdmin notes
- Start XAMPP and enable Apache + MySQL. Open phpMyAdmin at http://localhost/phpmyadmin.
- Create a new database named `findevent` or import the provided SQL: `db/schema.sql` (Import tab) or from terminal using the XAMPP mysql client:

```powershell
# using XAMPP mysql client (adjust path if needed)
C:\xampp\mysql\bin\mysql.exe -u root -p < .\db\schema.sql
```

- In the backend folder copy the example env and update it to match XAMPP credentials (default XAMPP MySQL user is `root` with empty password):

```powershell
cd backend
copy .env.example .env
# then edit .env and set DB_* values
```

If registrations do not persist to the database, verify that `DB_HOST`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` in `backend/.env` are correct and that MySQL is running in XAMPP.

Map provider
- The frontend previously used Google Maps which requires an API key. The project now supports Leaflet/OpenStreetMap (no API key required). If you prefer Google Maps, set `VITE_GOOGLE_MAPS_KEY` in your frontend env and update `src/components/MapView.tsx` accordingly.
