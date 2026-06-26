require('dotenv').config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
const port = process.env.PORT || 5000;

// Determine if we should use PostgreSQL (production/deployment) or SQLite (local development)
const usePostgreSQL = !!(process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost'));

let dbType = 'sqlite';
let pool = null;
let db = null;
let query;
let run;

if (usePostgreSQL) {
  dbType = 'postgres';
  const { Pool } = require("pg");
  
  const poolConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 5432,
        ssl: { rejectUnauthorized: false }
      };

  pool = new Pool(poolConfig);
  
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });
  
  console.log("Using PostgreSQL Database (Production Mode)");
  initializePostgresDatabase();

  query = async (sql, params = []) => {
    // Convert SQL parameter syntax from ? to $1, $2, etc. for PostgreSQL
    let pgSql = sql;
    let count = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${count}`);
      count++;
    }
    return await pool.query(pgSql, params);
  };

  run = async (sql, params = []) => {
    let pgSql = sql;
    let count = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${count}`);
      count++;
    }
    
    // Automatically append RETURNING id for insert statements if not already present
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql += ' RETURNING id';
    }

    const result = await pool.query(pgSql, params);
    return {
      lastID: result.rows && result.rows[0] ? result.rows[0].id : null,
      changes: result.rowCount
    };
  };

} else {
  dbType = 'sqlite';
  const sqlite3 = require("sqlite3").verbose();
  const dbPath = path.join(__dirname, "database.sqlite");
  
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error("Error opening SQLite database:", err.message);
    } else {
      console.log("Connected to the SQLite database at", dbPath);
      initializeSQLiteDatabase();
    }
  });

  console.log("Using SQLite Database (Local Mode)");

  query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows });
      });
    });
  };

  run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this); // 'this' contains 'lastID' and 'changes'
      });
    });
  };
}

async function initializePostgresDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cvs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        education TEXT,
        skills TEXT,
        experience TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cvs_email ON cvs(email)`);
    console.log("PostgreSQL tables and indexes verified/created.");
  } catch (err) {
    console.error("Error initializing PostgreSQL database:", err);
  }
}

function initializeSQLiteDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS cvs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        education TEXT,
        skills TEXT,
        experience TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_cvs_email ON cvs(email)`);
    console.log("SQLite tables and indexes verified/created.");
  });
}

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
    const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

    await run(sql, [name, email, hashed]);
    res.send("User registered successfully");
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).send("User already exists or error");
  }
});

// User login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email = ?";

  try {
    const result = await query(sql, [email]);
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
  const sql = "INSERT INTO cvs (name, email, phone, education, skills, experience) VALUES (?, ?, ?, ?, ?, ?)";
  try {
    const result = await run(sql, [name, email, phone, education, skills, experience]);
    const newId = result.lastID;
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
               VALUES (?, ?, ?, ?, ?, ?)`;

  try {
    await run(sql, [name, email, phone, education, skills, experience]);
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
  const sql = "SELECT * FROM cvs WHERE id = ?";
  try {
    const result = await query(sql, [id]);
    if (result.rows.length > 0) {
      const data = result.rows[0];
      res.send(`
        <html>
          <head><title>CV Preview</title></head>
          <body>
            <h1>${data.name}</h1>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Phone:</strong> ${data.phone}</p>
            <p><strong>Education:</strong><br>${data.education ? data.education.replace(/\n/g, "<br>") : ""}</p>
            <p><strong>Skills:</strong><br>${data.skills ? data.skills.replace(/\n/g, "<br>") : ""}</p>
            <p><strong>Experience:</strong><br>${data.experience ? data.experience.replace(/\n/g, "<br>") : ""}</p>
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
