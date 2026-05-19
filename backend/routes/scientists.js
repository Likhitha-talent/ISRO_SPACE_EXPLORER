const router = require("express").Router();

router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let sql = "SELECT * FROM Scientists WHERE 1=1";
    const params = [];
    if (search) {
      sql += " AND (scientist_name LIKE ? OR specialization LIKE ?)";
      const like = `%${search}%`;
      params.push(like, like);
    }
    sql += " ORDER BY scientist_name ASC";
    const [rows] = await req.db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await req.db.query(
      "SELECT * FROM Scientists WHERE scientist_id = ?", [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Scientist not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      scientist_name,
      specialization,
      experience_years
    } = req.body;

    if (!scientist_name)
      return res.status(400).json({
        error: "scientist_name is required"
      });

    const [result] = await req.db.query(
      `INSERT INTO Scientists
      (scientist_name, specialization, experience_years)
      VALUES (?, ?, ?)`,
      [
        scientist_name,
        specialization || null,
        experience_years || 0
      ]
    );

    res.status(201).json({
      scientist_id: result.insertId,
      message: "Scientist created"
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const {
      scientist_name,
      specialization,
      experience_years
    } = req.body;

    const [result] = await req.db.query(
      `UPDATE Scientists SET
        scientist_name   = COALESCE(?, scientist_name),
        specialization   = COALESCE(?, specialization),
        experience_years = COALESCE(?, experience_years)
       WHERE scientist_id=?`,
      [
        scientist_name,
        specialization,
        experience_years,
        req.params.id
      ]
    );

    if (!result.affectedRows)
      return res.status(404).json({
        error: "Scientist not found"
      });

    res.json({
      message:"Scientist updated"
    });

  } catch(err){
    res.status(500).json({
      error:err.message
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [result] = await req.db.query(
      "DELETE FROM Scientists WHERE scientist_id = ?", [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Scientist not found" });
    res.json({ message: "Scientist deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;