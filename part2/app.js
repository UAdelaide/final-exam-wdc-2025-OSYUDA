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






// Middleware 未修改部分
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Export the app instead of listening here
module.exports = app;