require('dotenv').config();
const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");


const app = express();
const port = process.env.PORT || 5000;

// Initialize PostgreSQL Pool BEFORE routes
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "cv",
  port: process.env.DB_PORT || 5432
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

console.log("PostgreSQL Pool initialized");

app.use(cors()); // 👈 ye CORS allow karega
app.use(express.json()); // ✅ FOR JSON parsing
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "docs")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "docs", "index.html"));
});


app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).send("Missing fields");
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)";

    await pool.query(sql, [name, email, hashed]);
    res.send("User registered successfully");
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).send("User already exists or error");
  }
});



// User login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email = $1";

  try {
    const result = await pool.query(sql, [email]);
    if (result.rows.length === 0) {
      return res.status(400).send("Invalid email");
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).send("Invalid password");

    res.send("Login successful");
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Server error");
  }
});


// Form submit → insert data → redirect to CV page
app.post("/generate-cv", async (req, res) => {
  const { name, email, phone, education, skills, experience } = req.body;
  const sql = "INSERT INTO cvs (name, email, phone, education, skills, experience) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id";
  try {
    const result = await pool.query(sql, [name, email, phone, education, skills, experience]);
    const newId = result.rows[0].id;
    res.redirect(`/cv/${newId}`);
  } catch (err) {
    console.error("Insert error:", err);
    res.status(500).send("Database error");
  }
});


app.post('/api/save-cv', async (req, res) => {
  console.log("Received CV data:", req.body);

  const { name, email, phone, education, skills, experience } = req.body;
  const sql = `INSERT INTO cvs (name, email, phone, education, skills, experience)
               VALUES ($1, $2, $3, $4, $5, $6)`;

  try {
    await pool.query(sql, [name, email, phone, education, skills, experience]);
    console.log("CV inserted successfully");
    res.send("CV saved successfully!");
  } catch (err) {
    console.error("Insert error:", err);
    return res.status(500).send("Database error");
  }
});


// CV preview page data
app.get("/cv/:id", async (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM cvs WHERE id = $1";
  try {
    const result = await pool.query(sql, [id]);
    if (result.rows.length > 0) {
      const data = result.rows[0];
      res.send(`
        <html>
          <head><title>CV Preview</title></head>
          <body>
            <h1>${data.name}</h1>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Phone:</strong> ${data.phone}</p>
            <p><strong>Education:</strong><br>${data.education.replace(/\n/g, "<br>")}</p>
            <p><strong>Skills:</strong><br>${data.skills.replace(/\n/g, "<br>")}</p>
            <p><strong>Experience:</strong><br>${data.experience.replace(/\n/g, "<br>")}</p>
            <button onclick="window.print()">Print CV</button>
          </body>
        </html>
      `);
    } else {
      res.send("CV not found");
    }
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).send("Server error");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


