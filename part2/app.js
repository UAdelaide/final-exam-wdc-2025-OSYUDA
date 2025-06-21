const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();



// add to import mysql and express-session
const mysql = require('mysql2');
const session = require('express-session');

// add to set up mysql database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'DogWalkService'
  });

// add to enable express to handle form submissions
app.use(express.urlencoded({ extended: true }));



// Middleware (unedited)
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));



// add to configure session，to store login state
app.use(session({
  secret: 'dogofthedaysecret',
  resave: false,
  saveUninitialized: true
}));

// add route to authenticate users during login
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM Users WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err) return res.status(500).send('Database error');
    if (results.length === 0) return res.send('User does not exist. Please try again.');

    const user = results[0];

    // add to direct password comparison, not using hashing
    if (password === user.password_hash) {
        req.session.user = user;

        // add to send user to the correct dashboard based on role
        if (user.role === 'owner') {
            return res.redirect('/owner-dashboard.html');
        }
        if (user.role === 'walker') {
          return res.redirect('/walker-dashboard.html');
        }
        return res.send('Invalid role');
      }
  });
});


// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Export the app instead of listening here
module.exports = app;