
const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "mysql@123",
  database: "cv"
});

db.connect(err => {
  if (err) throw err;
  console.log("MySQL Connected");
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).send("Missing fields");

  try {
    const hashed = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
    db.query(sql, [name, email, hashed], (err, result) => {
      if (err) return res.status(500).send("User already exists or error");
      res.send("User registered successfully");
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err || results.length === 0) return res.status(400).send("Invalid email");
    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send("Invalid password");
    res.send("Login successful");
  });
});

app.post("/api/save-cv", (req, res) => {
  const { name, email, phone, education, skills, experience } = req.body;
  const sql = `INSERT INTO cvs (name, email, phone, education, skills, experience)
               VALUES (?, ?, ?, ?, ?, ?)`;
  db.query(sql, [name, email, phone, education, skills, experience], (err, result) => {
    if (err) return res.status(500).send("Database error");
    res.send("CV saved successfully!");
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});