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