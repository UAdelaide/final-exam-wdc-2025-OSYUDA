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
      res.status(500).json({ error: 'Unable to fetch dogs data from database' });
    }
  });

// 🔹 第 7 题：/api/walkrequests/open
app.get('/api/walkrequests/open', async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT
          WalkRequests.request_id,
          Dogs.name AS dog_name,
          WalkRequests.requested_time,
          WalkRequests.duration_minutes,
          WalkRequests.location,
          Users.username AS owner_username
        FROM WalkRequests
        JOIN Dogs ON WalkRequests.dog_id = Dogs.dog_id
        JOIN Users ON Dogs.owner_id = Users.user_id
        WHERE WalkRequests.status = 'open'
      `);
      res.status(200).json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Unable to fetch open walk requests' });
    }
  });