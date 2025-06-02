const http = require("http");
const routes = require("./routes");

const server = http.createServer((req, res) => {
  // Tambahkan Header CORS di semua response
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Tangani request OPTIONS (preflight request)
  if (req.method === "OPTIONS") {
    res.writeHead(204); // No Content
    res.end();
    return;
  }

  res.setHeader("Content-Type", "application/json");
  routes(req, res);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Brainomaly API running at http://localhost:${PORT}`);
});
