//app.js for Part1 API Endpoints
const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const PORT = 3000;

//Middleware
app.use(express.json());

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'DogWalkService'
  });

  (async () => {
    try {
      const [users] = await db.query('SELECT COUNT(*) AS count FROM Users');
      if (users[0].count === 0) {
        await db.query(`
          INSERT INTO Users (username, email, password_hash, role) VALUES
          ('alice123', 'alice@example.com', 'hashed123', 'owner'),
          ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
          ('carol123', 'carol@example.com', 'hashed789', 'owner'),
          ('bowen', 'bowen@example.com', 'hashed122', 'walker'),
          ('pite', 'pite@example.com', 'hashed133', 'owner')
        `);
      }

      const [dogs] = await db.query('SELECT COUNT(*) AS count FROM Dogs');
      if (dogs[0].count === 0) {
        await db.query(`
          INSERT INTO Dogs (owner_id, name, size) VALUES
          ((SELECT user_id FROM Users WHERE username = 'alice123'), 'Max', 'medium'),
          ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Bella', 'small'),
          ((SELECT user_id FROM Users WHERE username = 'bowen'), 'Bagel', 'small'),
          ((SELECT user_id FROM Users WHERE username = 'bowen'), 'Flash', 'large'),
          ((SELECT user_id FROM Users WHERE username = 'pite'), 'Cake', 'medium')
        `);
      }

      const [walks] = await db.query('SELECT COUNT(*) AS count FROM WalkRequests');
      if (walks[0].count === 0) {
        await db.query(`
          INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
          ((SELECT dog_id FROM Dogs WHERE name = 'Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
          ((SELECT dog_id FROM Dogs WHERE name = 'Bella'), '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
          ((SELECT dog_id FROM Dogs WHERE name = 'Bagel'), '2025-06-11 11:15:00', 20, 'Bowen St', 'cancelled'),
          ((SELECT dog_id FROM Dogs WHERE name = 'Flash'), '2025-06-11 14:00:00', 60, 'District Park', 'completed'),
          ((SELECT dog_id FROM Dogs WHERE name = 'Cake'), '2025-06-12 15:30:00', 35, 'Dog Park', 'open')
        `);
      }
    } catch (err) {
      console.error('❌ Error inserting test data:', err);
    }
  })();

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
      res.status(200).json(requests);
    } catch (err) {
      res.status(500).json({ error: 'Unable to fetch open walk requests' });
    }
  });

// 1.8 /api/walkers/summary
app.get('/api/walkers/summary', async (req, res) => {
    try {
      const [summary] = await db.query(`
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
      res.status(200).json(summary);
    } catch (err) {
      res.status(500).json({ error: 'Unable to fetch walker summaries' });
    }
  });

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });