require('dotenv').config();
const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");


const app = express();
const port = process.env.PORT || 5000;

app.use(cors()); // 👈 ye CORS allow karega
app.use(express.json()); // ✅ FOR JSON parsing
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "docs")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "docs", "index.html"));
});


app.post("/register", async (req, res) => {
  // console.log("REQ.BODY = ", req.body); // 👈 CHECK what data is coming

  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).send("Missing fields");
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

    db.query(sql, [name, email, hashed], (err, result) => {
      if (err) {
        console.error("Registration error:", err); // 👈 SHOW REAL DB ERROR
        return res.status(500).send("User already exists or error");
      }
      res.send("User registered successfully");
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send("Server error");
  }
});



// User login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], async (err, result) => {
    if (err || result.length === 0) {
      return res.status(400).send("Invalid email");
    }

    const user = result[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).send("Invalid password");

    res.send("Login successful");
  });
});

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "mysql@123",
  database: process.env.DB_NAME || "cv"
});

db.connect((err) => {
  if (err) throw err;
  console.log("MySQL Connected");
});

// Form submit → insert data → redirect to CV page
app.post("/generate-cv", (req, res) => {
  const { name, email, phone, education, skills, experience } = req.body;
  const sql = "INSERT INTO cvs (name, email, phone, education, skills, experience) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(sql, [name, email, phone, education, skills, experience], (err, result) => {
    if (err) throw err;
    const newId = result.insertId;
    res.redirect(`/cv/${newId}`);
  });
});


app.post('/api/save-cv', (req, res) => {
  console.log("Received CV data:", req.body); // 👈 ADD THIS

  const { name, email, phone, education, skills, experience } = req.body;

  const sql = `INSERT INTO cvs (name, email, phone, education, skills, experience)
               VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(sql, [name, email, phone, education, skills, experience], (err, result) => {
    if (err) {
      console.error("Insert error:", err); // 👈 ADD THIS
      return res.status(500).send("Database error");
    }

    console.log("CV inserted successfully"); // 👈 ADD THIS
    res.send("CV saved successfully!");
  });
});


// CV preview page data
app.get("/cv/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM cvs WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      const data = result[0];
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
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


