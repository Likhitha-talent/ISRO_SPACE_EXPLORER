const jwt = require("jsonwebtoken");
const ACCESS_SECRET = process.env.JWT_SECRET || "isro_access_secret_change_me";

// ─── Verify any logged-in user ────────────────────────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Authentication required" });

  try {
    const token = authHeader.split(" ")[1];
    req.user = jwt.verify(token, ACCESS_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ─── Verify admin role only ───────────────────────────────────────────
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Admin access required" });
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
