const router = require("express").Router();

router.get("/", async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `
SELECT
    s.satellite_id,
    s.satellite_name,
    s.launch_date,
    s.launch_vehicle,
    s.operational_status,
    s.country,

    MAX(lv.vehicle_type) AS vehicle_type,
    MAX(lv.payload_capacity) AS payload_capacity,

    GROUP_CONCAT(
      DISTINCT sc.scientist_name
      SEPARATOR ', '
    ) AS scientists,

    GROUP_CONCAT(
      DISTINCT sc.specialization
      SEPARATOR ' | '
    ) AS scientist_specializations,

    GROUP_CONCAT(
      DISTINCT m.mission_type
      SEPARATOR ', '
    ) AS mission_types

FROM Satellites s

LEFT JOIN Launch_Vehicles lv
ON lv.vehicle_name=SUBSTRING_INDEX(s.launch_vehicle,'-',1)

LEFT JOIN Satellite_Mission sm
ON sm.satellite_id = s.satellite_id

LEFT JOIN Missions m
ON m.mission_id=sm.mission_id

LEFT JOIN Mission_Scientist ms
ON ms.mission_id=m.mission_id

LEFT JOIN Scientists sc
ON sc.scientist_id=ms.scientist_id

WHERE 1=1
`;

    const params = [];

    if (search) {
      sql += " AND (s.satellite_name LIKE ? OR s.launch_vehicle LIKE ? OR s.country LIKE ?)";
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (status === "operational") {
      sql += " AND s.operational_status LIKE '%Operational%' AND s.operational_status NOT LIKE '%Not%'";
    } else if (status === "inactive") {
      sql += " AND (s.operational_status LIKE '%Not%' OR s.operational_status LIKE '%unsuccessful%' OR s.operational_status LIKE '%failure%')";
    }
    sql += `
GROUP BY
s.satellite_id,
s.satellite_name,
s.launch_date,
s.launch_vehicle,
s.operational_status,
s.country

ORDER BY s.launch_date DESC
`;

    const [rows] = await req.db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await req.db.query(`
      SELECT s.*,
          lv.vehicle_type,
          lv.payload_capacity,
      
      GROUP_CONCAT(
      DISTINCT sc.scientist_name
      ORDER BY sc.scientist_name
      SEPARATOR ', '
      ) AS scientists,
      
      GROUP_CONCAT(
      DISTINCT sc.specialization
      ORDER BY sc.scientist_name
      SEPARATOR ' | '
      ) AS specializations,
      
      GROUP_CONCAT(
      DISTINCT m.mission_type
      ORDER BY m.mission_type
      SEPARATOR ', '
      ) AS mission_types
      
      FROM Satellites s

LEFT JOIN Launch_Vehicles lv
ON lv.vehicle_name=SUBSTRING_INDEX(s.launch_vehicle,'-',1)

LEFT JOIN Satellite_Mission sm
ON sm.satellite_id = s.satellite_id

LEFT JOIN Missions m
ON m.mission_id=sm.mission_id

LEFT JOIN Mission_Scientist ms
ON ms.mission_id=m.mission_id

LEFT JOIN Scientists sc
ON sc.scientist_id=ms.scientist_id
      WHERE s.satellite_id=?
      
      GROUP BY s.satellite_id
      `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Satellite not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { satellite_name, launch_date, launch_vehicle, operational_status, country } = req.body;
    if (!satellite_name) return res.status(400).json({ error: "satellite_name is required" });
    const [result] = await req.db.query(
      `INSERT INTO Satellites (satellite_name, launch_date, launch_vehicle, operational_status, country)
       VALUES (?, ?, ?, ?, ?)`,
      [satellite_name, launch_date || null, launch_vehicle || null, operational_status || null, country || "India"]
    );
    res.status(201).json({ satellite_id: result.insertId, message: "Satellite created" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Satellite name already exists" });
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { satellite_name, launch_date, launch_vehicle, operational_status, country } = req.body;
    const [result] = await req.db.query(
      `UPDATE Satellites SET
        satellite_name     = COALESCE(?, satellite_name),
        launch_date        = COALESCE(?, launch_date),
        launch_vehicle     = COALESCE(?, launch_vehicle),
        operational_status = COALESCE(?, operational_status),
        country            = COALESCE(?, country)
       WHERE satellite_id = ?`,
      [satellite_name, launch_date, launch_vehicle, operational_status, country, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Satellite not found" });
    res.json({ message: "Satellite updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [result] = await req.db.query(
      "DELETE FROM Satellites WHERE satellite_id = ?",
      [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Satellite not found" });
    res.json({ message: "Satellite deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;