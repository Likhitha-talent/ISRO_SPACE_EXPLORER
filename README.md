# 🚀 ISRO Space Explorer Portal

A full-stack web application for exploring ISRO missions, satellites, scientists, launch vehicles, and launch sites.

## Features

- Satellite Explorer
- Mission Explorer
- Scientist Database
- Launch Vehicle Information
- Launch Site Information
- Admin Panel
- Authentication with Refresh Tokens
- Search and Filtering
- CRUD operations for all entities
- Real ISRO scientist and mission relationships

---

## Tech Stack

### Frontend
- React.js
- CSS

### Backend
- Node.js
- Express.js

### Database
- MySQL

---

## Project Structure

```text
isro-project/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env
│   └── routes/
│       ├── satellites.js
│       ├── missions.js
│       ├── vehicles.js
│       ├── sites.js
│       └── scientists.js
│
├── frontend/
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── App.js
│       ├── index.js
│       ├── api/
│       └── hooks/
│
└── README.md
