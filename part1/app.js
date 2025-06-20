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
      const [dogs] = await db.query(`
        SELECT
          Dogs.name AS dog_name,
          Dogs.size,
          Users.username AS owner_username
        FROM Dogs
        JOIN Users ON Dogs.owner_id = Users.user_id
      `);
      res.status(200).json(dogs);
    } catch (err) {
      res.status(500).json({ error: 'Unable to fetch dogs data from database' });
    }
  });

// 1.7/api/walkrequests/open
app.get('/api/walkrequests/open', async (req, res) => {
    try {
      const [requests] = await db.query(`
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

// 1.8 /api/walkers/summary
app.get('/api/walkers/summary', async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT
          Users.username AS walker_username,
          COUNT(WalkRatings.rating_id) AS total_ratings,
          ROUND(AVG(WalkRatings.rating), 1) AS average_rating,
          COUNT(CASE WHEN WalkRequests.status = 'completed' THEN 1 END) AS completed_walks
        FROM Users
        LEFT JOIN WalkRatings ON Users.user_id = WalkRatings.walker_id
        LEFT JOIN WalkRequests ON WalkRatings.request_id = WalkRequests.request_id
        WHERE Users.role = 'walker'
        GROUP BY Users.user_id
      `);
      res.status(200).json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch walker summaries' });
    }
  });