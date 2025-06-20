const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const PORT = 3000;
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'DogWalkService'
  });

// 1.6/api/dogs
app.get('/api/dogs', async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT
          Dogs.name AS dog_name,
          Dogs.size,
          Users.username AS owner_username
        FROM Dogs
        JOIN Users ON Dogs.owner_id = Users.user_id
      `);
      res.status(200).json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch dogs data' });
    }
  });

// 1.7 