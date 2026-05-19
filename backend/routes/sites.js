const router = require("express").Router();

// ─── GET all sites ────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let sql = "SELECT * FROM Launch_Sites WHERE 1=1";
    const params = [];

    if (search) {
      sql += " AND (site_name LIKE ? OR location LIKE ? OR state LIKE ?)";
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    sql += " ORDER BY site_name ASC";
    const [rows] = await req.db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET single site ──────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await req.db.query(
      "SELECT * FROM Launch_Sites WHERE site_id = ?",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Site not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST create site ─────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { site_name, location, state } = req.body;
    if (!site_name) return res.status(400).json({ error: "site_name is required" });

    const [result] = await req.db.query(
      "INSERT INTO Launch_Sites (site_name, location, state) VALUES (?, ?, ?)",
      [site_name, location || null, state || null]
    );
    res.status(201).json({ site_id: result.insertId, message: "Site created" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Site name already exists" });
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT update site ──────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { site_name, location, state } = req.body;
    const [result] = await req.db.query(
      `UPDATE Launch_Sites SET
        site_name = COALESCE(?, site_name),
        location  = COALESCE(?, location),
        state     = COALESCE(?, state)
       WHERE site_id = ?`,
      [site_name, location, state, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Site not found" });
    res.json({ message: "Site updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE site ──────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await req.db.query(
      "DELETE FROM Launch_Sites WHERE site_id = ?",
      [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Site not found" });
    res.json({ message: "Site deleted" });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2")
      return res.status(409).json({ error: "Cannot delete — site is referenced in Launches" });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
