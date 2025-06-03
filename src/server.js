// src/server.js
require("dotenv").config(); // ✅ HARUS di atas sebelum pakai process.env

const http = require("http");
const routes = require("./routes");
const connectDB = require("./db");

connectDB(); // setelah .env dibaca

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  res.setHeader("Content-Type", "application/json");
  routes(req, res);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Brainomaly API running at http://localhost:${PORT}`);
});
