# 🚀 ISRO Space Portal

Full-stack web app: React frontend + Node/Express backend + MySQL database.

---

## Project Structure

```
isro-project/
├── backend/
│   ├── server.js          ← Express entry point
│   ├── package.json
│   ├── .env               ← Your DB credentials go here
│   └── routes/
│       ├── satellites.js
│       ├── missions.js
│       ├── vehicles.js
│       ├── sites.js
│       └── scientists.js
└── frontend/
    ├── package.json
    └── src/
        ├── App.js         ← Main UI (user + admin views)
        ├── index.js
        ├── api/index.js   ← All API calls
        └── hooks/useApi.js← Data-fetching hooks
```

---

## Prerequisites

- Node.js 18+
- MySQL 8+ running locally (or a remote host)
- The `isro_db` database already created and populated

---

## Step 1 — Set up the database

Open MySQL and run the SQL schema + inserts from the project brief.
Make sure the database name is `isro_db`.

---

## Step 2 — Configure backend

```bash
cd backend
cp .env .env.local   # optional — edit .env directly
```

Edit `.env`:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=isro_db
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000
```

Install and start:
```bash
npm install
npm run dev        # uses nodemon for auto-reload
# or: npm start   # plain node
```

Verify the API is running:
```
http://localhost:3001/api/health
```

You should see: `{ "status": "ok", "database": "connected" }`

---

## Step 3 — Start the frontend

```bash
cd ../frontend
npm install
npm start
```

Opens at `http://localhost:3000`

The `"proxy": "http://localhost:3001"` in frontend/package.json
routes all `/api/*` calls to the backend automatically.

---

## API Reference

All endpoints follow REST conventions.

| Method | Path                  | Description              |
|--------|-----------------------|--------------------------|
| GET    | /api/health           | DB connection check      |
| GET    | /api/satellites       | List (supports ?search=, ?status=) |
| GET    | /api/satellites/:id   | Single satellite         |
| POST   | /api/satellites       | Create satellite         |
| PUT    | /api/satellites/:id   | Update satellite         |
| DELETE | /api/satellites/:id   | Delete satellite         |

Same pattern for `/api/missions`, `/api/vehicles`, `/api/sites`, `/api/scientists`.

### Example POST body — satellite
```json
{
  "satellite_name": "EOS-10",
  "launch_date": "2025-06-15",
  "launch_vehicle": "PSLV-C63",
  "operational_status": "Operational",
  "country": "India"
}
```

---

## Running both together (one terminal each)

```bash
# Terminal 1
cd isro-project/backend && npm run dev

# Terminal 2
cd isro-project/frontend && npm start
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ECONNREFUSED` on DB | Check MySQL is running: `sudo service mysql start` |
| `Access denied for user` | Verify DB_USER / DB_PASSWORD in `.env` |
| CORS errors in browser | Add frontend URL to `ALLOWED_ORIGINS` in `.env` |
| `ER_DUP_ENTRY` on insert | The name already exists in that table |
| `ER_ROW_IS_REFERENCED` on delete | Record is used in Launches table — remove launches first |
