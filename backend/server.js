require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const satellitesRouter = require("./routes/satellites");
const missionsRouter   = require("./routes/missions");
const vehiclesRouter   = require("./routes/vehicles");
const sitesRouter      = require("./routes/sites");
const scientistsRouter = require("./routes/scientists");
const authRouter       = require("./routes/auth");
const { requireAdmin } = require("./middleware/auth");

const app = express();

app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(","),
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || "localhost",
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME     || "isro_db",
  waitForConnections: true,
  connectionLimit: 10,
});

app.use((req, _res, next) => { req.db = pool; next(); });

app.get("/api/health", async (req, res) => {
  try {
    await req.db.query("SELECT 1");
    res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Public: auth + all GET reads
app.use("/api/auth",       authRouter);
app.use("/api/satellites", satellitesRouter);
app.use("/api/missions",   missionsRouter);
app.use("/api/vehicles",   vehiclesRouter);
app.use("/api/sites",      sitesRouter);
app.use("/api/scientists", scientistsRouter);

app.use((req, res) => res.status(404).json({ error: `${req.method} ${req.path} not found` }));
app.use((err, req, res, _next) => {
  console.error("[ERROR]", err.message);
  res.status(500).json({ error: "Internal server error", detail: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 ISRO API → http://localhost:${PORT}`);
  console.log(`   Health  → http://localhost:${PORT}/api/health\n`);
});
