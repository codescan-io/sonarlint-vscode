var mysql = require('mysql');

var connection = mysql.createConnection(
  {
    host:'localhost',
    user: "admin",
    database: "project",
    password: "", // sensitive
    multipleStatements: true
  });

connection.connect();
