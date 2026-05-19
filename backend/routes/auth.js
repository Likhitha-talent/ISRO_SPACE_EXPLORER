const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = 10;
const ACCESS_SECRET  = process.env.JWT_SECRET        || "isro_access_secret_change_me";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "isro_refresh_secret_change_me";
const ACCESS_EXPIRY  = "15m";   // short-lived
const REFRESH_EXPIRY = "7d";    // long-lived

// ─── Helpers ─────────────────────────────────────────────────────────
const makeAccessToken  = (payload) => jwt.sign(payload, ACCESS_SECRET,  { expiresIn: ACCESS_EXPIRY });
const makeRefreshToken = (payload) => jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });

const refreshExpiryDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
};

// ─── POST /api/auth/register ─────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password)
      return res.status(400).json({ error: "full_name, email and password are required" });

    if (password.length < 8)
      return res.status(400).json({ error: "Password must be at least 8 characters" });

    // Check duplicate email
    const [existing] = await req.db.query(
      "SELECT user_id FROM Users WHERE email = ?", [email]
    );
    if (existing.length)
      return res.status(409).json({ error: "Email already registered" });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // New users are always role='user'. Admins must be set via DB.
    const [result] = await req.db.query(
      "INSERT INTO Users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'user')",
      [full_name, email.toLowerCase().trim(), password_hash]
    );

    const payload = { user_id: result.insertId, email, role: "user", name: full_name };
    const accessToken  = makeAccessToken(payload);
    const refreshToken = makeRefreshToken(payload);

    await req.db.query(
      "INSERT INTO Refresh_Tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
      [result.insertId, refreshToken, refreshExpiryDate()]
    );

    res.status(201).json({
      message: "Account created",
      accessToken,
      refreshToken,
      user: { user_id: result.insertId, full_name, email, role: "user" },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const [rows] = await req.db.query(
      "SELECT * FROM Users WHERE email = ? AND is_active = TRUE",
      [email.toLowerCase().trim()]
    );
    if (!rows.length)
      return res.status(401).json({ error: "Invalid email or password" });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: "Invalid email or password" });

    // Update last_login
    await req.db.query(
      "UPDATE Users SET last_login = NOW() WHERE user_id = ?",
      [user.user_id]
    );

    const payload = { user_id: user.user_id, email: user.email, role: user.role, name: user.full_name };
    const accessToken  = makeAccessToken(payload);
    const refreshToken = makeRefreshToken(payload);

    // Store refresh token
    await req.db.query(
      "INSERT INTO Refresh_Tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.user_id, refreshToken, refreshExpiryDate()]
    );

    res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: { user_id: user.user_id, full_name: user.full_name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ error: "Refresh token required" });

    // Verify token exists in DB and not expired
    const [rows] = await req.db.query(
      "SELECT * FROM Refresh_Tokens WHERE token = ? AND expires_at > NOW()",
      [refreshToken]
    );
    if (!rows.length)
      return res.status(401).json({ error: "Invalid or expired refresh token" });

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const newAccessToken = makeAccessToken({
      user_id: decoded.user_id, email: decoded.email,
      role: decoded.role, name: decoded.name,
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await req.db.query("DELETE FROM Refresh_Tokens WHERE token = ?", [refreshToken]);
    }
    res.json({ message: "Logged out" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res.status(401).json({ error: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, ACCESS_SECRET);

    const [rows] = await req.db.query(
      "SELECT user_id, full_name, email, role, created_at, last_login FROM Users WHERE user_id = ?",
      [decoded.user_id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });

    res.json(rows[0]);
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

module.exports = router;
