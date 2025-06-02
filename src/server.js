const http = require("http");
const routes = require("./routes");

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  routes(req, res);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Brainomaly API running at http://localhost:${PORT}`);
});
