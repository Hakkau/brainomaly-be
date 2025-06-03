const {
  registerHandler,
  loginHandler,
  addHistoryHandler,
  getAllHistoryHandler,
  getUserHistoryHandler,
  updateHistoryHandler,
  deleteHistoryHandler,
  getUserDetailWithHistoryHandler,
} = require("./handler");

const { verifyToken } = require("./auth");
const url = require("url");

const routes = async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // AUTH ROUTES
  if (path === "/register" && method === "POST")
    return registerHandler(req, res);
  if (path === "/login" && method === "POST") return loginHandler(req, res);

  // ADMIN ROUTES

  // Admin akses semua history
  if (path === "/admin/history" && method === "GET") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    console.log(`[ADMIN] ${user.email} mengakses ${path}`);
    return getAllHistoryHandler(req, res);
  }

  if (path.startsWith("/admin/history/") && method === "PUT") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    const id = path.split("/")[3];
    console.log(`[ADMIN] ${user.email} mengakses ${path}`);
    return updateHistoryHandler(req, res, id);
  }

  // Admin akses detail user + semua history-nya
  if (path.startsWith("/admin/history/") && method === "GET") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    const userId = path.split("/")[3];
    return getUserDetailWithHistoryHandler(req, res, userId);
  }

  if (path.startsWith("/admin/history/") && method === "DELETE") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    const id = path.split("/")[3];
    console.log(`[ADMIN] ${user.email} mengakses ${path}`);
    return deleteHistoryHandler(req, res, id);
  }

  // USER ROUTES
  if (path === "/user/history" && method === "POST") {
    const user = verifyToken(req, res, "user");
    if (!user) return;
    req.user = user;
    return addHistoryHandler(req, res);
  }

  if (path === "/user/history" && method === "GET") {
    const user = verifyToken(req, res, "user");
    if (!user) return;
    return getUserHistoryHandler(req, res, user.id);
  }

  // GENERIC ROUTES — Tetap pakai URL netral tanpa /admin atau /user
  if (path === "/history" && method === "GET") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    return getAllHistoryHandler(req, res);
  }

  if (path === "/history" && method === "POST") {
    const user = verifyToken(req, res, "user");
    if (!user) return;
    req.user = user;
    return addHistoryHandler(req, res);
  }

  if (path.startsWith("/history/user/") && method === "GET") {
    const user = verifyToken(req, res, "user");
    if (!user) return;
    const userId = path.split("/")[3];
    if (user.id !== userId) {
      res.writeHead(403);
      return res.end(JSON.stringify({ message: "Akses ditolak" }));
    }
    return getUserHistoryHandler(req, res, userId);
  }

  if (path.startsWith("/history/") && method === "PUT") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    const id = path.split("/")[2];
    return updateHistoryHandler(req, res, id);
  }

  if (path.startsWith("/history/") && method === "DELETE") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    const id = path.split("/")[2];
    return deleteHistoryHandler(req, res, id);
  }

  res.writeHead(404);
  res.end(JSON.stringify({ message: "Route tidak ditemukan" }));
};

module.exports = routes;
