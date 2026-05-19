const router = require("express").Router();

// ─── GET all missions ─────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let sql = "SELECT * FROM Missions WHERE 1=1";
    const params = [];

    if (search) {
      sql += " AND (mission_name LIKE ? OR launch_vehicle LIKE ? OR launch_site LIKE ?)";
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    sql += " ORDER BY launch_date DESC";
    const [rows] = await req.db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET single mission ───────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await req.db.query(
      "SELECT * FROM Missions WHERE mission_id = ?",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Mission not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST create mission ──────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { mission_name, launch_date, launch_vehicle, launch_site } = req.body;
    if (!mission_name) return res.status(400).json({ error: "mission_name is required" });

    const [result] = await req.db.query(
      `INSERT INTO Missions (mission_name, launch_date, launch_vehicle, launch_site)
       VALUES (?, ?, ?, ?)`,
      [mission_name, launch_date || null, launch_vehicle || null, launch_site || null]
    );
    res.status(201).json({ mission_id: result.insertId, message: "Mission created" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Mission name already exists" });
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT update mission ───────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { mission_name, launch_date, launch_vehicle, launch_site } = req.body;
    const [result] = await req.db.query(
      `UPDATE Missions SET
        mission_name   = COALESCE(?, mission_name),
        launch_date    = COALESCE(?, launch_date),
        launch_vehicle = COALESCE(?, launch_vehicle),
        launch_site    = COALESCE(?, launch_site)
       WHERE mission_id = ?`,
      [mission_name, launch_date, launch_vehicle, launch_site, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Mission not found" });
    res.json({ message: "Mission updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE mission ───────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await req.db.query(
      "DELETE FROM Missions WHERE mission_id = ?",
      [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Mission not found" });
    res.json({ message: "Mission deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
