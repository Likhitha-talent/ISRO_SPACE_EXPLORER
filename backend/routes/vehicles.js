const router = require("express").Router();

// ─── GET all vehicles ─────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let sql = "SELECT * FROM Launch_Vehicles WHERE 1=1";
    const params = [];

    if (search) {
      sql += " AND (vehicle_name LIKE ? OR vehicle_type LIKE ?)";
      const like = `%${search}%`;
      params.push(like, like);
    }

    sql += " ORDER BY payload_capacity DESC";
    const [rows] = await req.db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET single vehicle ───────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await req.db.query(
      "SELECT * FROM Launch_Vehicles WHERE vehicle_id = ?",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Vehicle not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST create vehicle ──────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { vehicle_name, vehicle_type, payload_capacity } = req.body;
    if (!vehicle_name) return res.status(400).json({ error: "vehicle_name is required" });

    const [result] = await req.db.query(
      `INSERT INTO Launch_Vehicles (vehicle_name, vehicle_type, payload_capacity)
       VALUES (?, ?, ?)`,
      [vehicle_name, vehicle_type || null, payload_capacity || null]
    );
    res.status(201).json({ vehicle_id: result.insertId, message: "Vehicle created" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Vehicle name already exists" });
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT update vehicle ───────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { vehicle_name, vehicle_type, payload_capacity } = req.body;
    const [result] = await req.db.query(
      `UPDATE Launch_Vehicles SET
        vehicle_name     = COALESCE(?, vehicle_name),
        vehicle_type     = COALESCE(?, vehicle_type),
        payload_capacity = COALESCE(?, payload_capacity)
       WHERE vehicle_id = ?`,
      [vehicle_name, vehicle_type, payload_capacity, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Vehicle not found" });
    res.json({ message: "Vehicle updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE vehicle ───────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await req.db.query(
      "DELETE FROM Launch_Vehicles WHERE vehicle_id = ?",
      [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Vehicle not found" });
    res.json({ message: "Vehicle deleted" });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2")
      return res.status(409).json({ error: "Cannot delete — vehicle is used in Launches" });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
