var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// This variable will hold the database connection.
let db;

// ----------------------------------------------------------------------------
// DATABASE SETUP
// ----------------------------------------------------------------------------
// This is an IIFE (Immediately Invoked Function Expression) that runs once on startup.
// It connects to MySQL, creates the database and tables if they don't exist,
// and inserts sample data if the tables are empty.
(async () => {
  try {
    // 1. Connect to MySQL server (without specifying a database)
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Set your MySQL root password here if you have one
      multipleStatements: true // Allow multiple SQL statements in one query
    });

    // 2. Create the DogWalkService database if it doesn't already exist.
    await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
    await connection.end();

    // 3. Now, connect to the DogWalkService database.
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService',
      multipleStatements: true
    });
    console.log("Successfully connected to DogWalkService database.");

    // 4. Define the SQL for creating all tables from the dogwalks.sql file.
    //    Using "CREATE TABLE IF NOT EXISTS" prevents errors on subsequent runs.
    const createTablesSql = `
      CREATE TABLE IF NOT EXISTS Users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('owner', 'walker') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS Dogs (
        dog_id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        size ENUM('small', 'medium', 'large') NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES Users(user_id)
      );
      CREATE TABLE IF NOT EXISTS WalkRequests (
        request_id INT AUTO_INCREMENT PRIMARY KEY,
        dog_id INT NOT NULL,
        requested_time DATETIME NOT NULL,
        duration_minutes INT NOT NULL,
        location VARCHAR(255) NOT NULL,
        status ENUM('open', 'accepted', 'completed', 'cancelled') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
      );
      CREATE TABLE IF NOT EXISTS WalkApplications (
        application_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        walker_id INT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id),
        CONSTRAINT unique_application UNIQUE (request_id, walker_id)
      );
      CREATE TABLE IF NOT EXISTS WalkRatings (
        rating_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        walker_id INT NOT NULL,
        owner_id INT NOT NULL,
        rating INT CHECK (rating BETWEEN 1 AND 5),
        comments TEXT,
        rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id),
        FOREIGN KEY (owner_id) REFERENCES Users(user_id),
        CONSTRAINT unique_rating_per_walk UNIQUE (request_id)
      );
    `;
    // Execute the table creation SQL.
    await db.query(createTablesSql);
    console.log("Tables created or already exist.");

    // 5. Check if the database is empty by counting users.
    const [rows] = await db.execute('SELECT COUNT(*) AS count FROM Users');
    if (rows[0].count === 0) {
      console.log("Database is empty. Seeding with initial data...");
      // If empty, run the INSERT statements to seed the database.
      const seedSql = `
        INSERT INTO Users (username, email, password_hash, role) VALUES
        ('alice123', 'alice@example.com', 'hashed123', 'owner'),
        ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
        ('carol123', 'carol@example.com', 'hashed789', 'owner'),
        ('davewalker', 'dave@example.com', 'hashedabc', 'walker'),
        ('emilyowner', 'emily@example.com', 'hasheddef', 'owner');

        INSERT INTO Dogs (owner_id, name, size) VALUES
        (1, 'Max', 'medium'), (3, 'Bella', 'small'), (1, 'Rocky', 'large'),
        (5, 'Lucy', 'small'), (3, 'Buddy', 'medium');

        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
        (1, '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
        (2, '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
        (3, '2025-06-11 10:00:00', 60, 'City Center', 'completed'),
        (4, '2025-06-12 14:00:00', 20, 'Suburbia Gardens', 'completed'),
        (5, '2025-06-12 16:00:00', 45, 'River Trail', 'cancelled');

        -- Add applications and ratings for the summary endpoint
        INSERT INTO WalkApplications(request_id, walker_id, status) VALUES
        (2, 2, 'accepted'), -- bobwalker accepted bella's walk
        (3, 2, 'accepted'), -- bobwalker accepted rocky's walk
        (4, 4, 'accepted'); -- davewalker accepted lucy's walk

        INSERT INTO WalkRatings(request_id, walker_id, owner_id, rating, comments) VALUES
        (3, 2, 1, 5, 'Bob was fantastic with Rocky!'), -- alice rates bob
        (4, 4, 5, 4, 'Great walk, thanks Dave.');     -- emily rates dave
      `;
      await db.query(seedSql);
      console.log("Database seeded successfully.");
    }
  } catch (err) {
    console.error('Error setting up database:', err);
    // Exit the process if the database connection fails, as the app cannot run without it.
    process.exit(1);
  }
})();

// ----------------------------------------------------------------------------
// API ROUTES
// ----------------------------------------------------------------------------

/**
 * @api {get} /api/dogs
 * @description Return a list of all dogs with their size and owner's username.
 */
app.get('/api/dogs', async (req, res) => {
  try {
    const sql = `
      SELECT
        d.name AS dog_name,
        d.size,
        u.username AS owner_username
      FROM Dogs AS d
      JOIN Users AS u ON d.owner_id = u.user_id;
    `;
    const [dogs] = await db.execute(sql);
    res.json(dogs);
  } catch (err) {
    console.error('Error fetching dogs:', err);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

/**
 * @api {get} /api/walkrequests/open
 * @description Return all open walk requests.
 */
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const sql = `
      SELECT
        wr.request_id,
        d.name AS dog_name,
        wr.requested_time,
        wr.duration_minutes,
        wr.location,
        u.username AS owner_username
      FROM WalkRequests AS wr
      JOIN Dogs AS d ON wr.dog_id = d.dog_id
      JOIN Users AS u ON d.owner_id = u.user_id
      WHERE wr.status = 'open';
    `;
    const [requests] = await db.execute(sql);
    res.json(requests);
  } catch (err) {
    console.error('Error fetching open walk requests:', err);
    res.status(500).json({ error: 'Failed to fetch open walk requests' });
  }
});

/**
 * @api {get} /api/walkers/summary
 * @description Return a summary of each walker with their average rating and completed walks.
 */
app.get('/api/walkers/summary', async (req, res) => {
  try {
    // This query is more complex. It uses LEFT JOINs to ensure all walkers are included,
    // even if they have no ratings or completed walks.
    // COALESCE is used to turn NULL results (for walkers with no data) into 0.
    const sql = `
      SELECT
        u.username AS walker_username,
        COALESCE(ratings.total_ratings, 0) AS total_ratings,
        ratings.average_rating,
        COALESCE(walks.completed_walks, 0) AS completed_walks
      FROM Users AS u
      LEFT JOIN (
        -- Subquery to calculate total and average ratings for each walker
        SELECT
          walker_id,
          COUNT(rating_id) AS total_ratings,
          AVG(rating) AS average_rating
        FROM WalkRatings
        GROUP BY walker_id
      ) AS ratings ON u.user_id = ratings.walker_id
      LEFT JOIN (
        -- Subquery to count completed walks for each walker
        SELECT
          wa.walker_id,
          COUNT(wa.application_id) AS completed_walks
        FROM WalkApplications AS wa
        JOIN WalkRequests AS wr ON wa.request_id = wr.request_id
        WHERE wr.status = 'completed' AND wa.status = 'accepted'
        GROUP BY wa.walker_id
      ) AS walks ON u.user_id = walks.walker_id
      WHERE u.role = 'walker';
    `;
    const [summary] = await db.execute(sql);
    res.json(summary);
  } catch (err) {
    console.error('Error fetching walkers summary:', err);
    res.status(500).json({ error: 'Failed to fetch walkers summary' });
  }
});

// ----------------------------------------------------------------------------
// START THE SERVER
// ----------------------------------------------------------------------------
// Define the port to run the server on.
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server is running and listening on http://localhost:${port}`);
});

module.exports = app;
