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



// Middleware 未修改部分
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));



// ✅ 新增：配置 session，用于保存登录状态
app.use(session({
  secret: 'mydogsecret', // ← 可以任意设定
  resave: false,
  saveUninitialized: true
}));

// ✅ 新增：处理登录表单提交
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM Users WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err) return res.status(500).send('Database error');
    if (results.length === 0) return res.send('User not found');

    const user = results[0];

    // 简单明文密码比对（如果你用的是 bcrypt，可告诉我帮你改）
    if (password === user.password_hash) {
        req.session.user = user;

        // Redirect based on user role
        if (user.role === 'owner') {
          return res.redirect('/owner-dashboard.html');
        } else if (user.role === 'walker') {
          return res.redirect('/walker-dashboard.html');
        } else {
          return res.send('Unknown role');
        }
      } else {
        return res.send('Incorrect password');
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