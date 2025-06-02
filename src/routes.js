const {
  registerHandler,
  loginHandler,
  addHistoryHandler,
  getAllHistoryHandler,
  getUserHistoryHandler,
  updateHistoryHandler,
  deleteHistoryHandler,
} = require("./handler");

const { verifyToken } = require("./auth");
const url = require("url");

const routes = async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  if (path === "/register" && method === "POST")
    return registerHandler(req, res);
  if (path === "/login" && method === "POST") return loginHandler(req, res);

  // ADMIN ROUTES
  if (path === "/admin/history" && method === "GET") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    return getAllHistoryHandler(req, res);
  }

  if (path.startsWith("/admin/history/") && method === "PUT") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    const id = path.split("/")[3];
    return updateHistoryHandler(req, res, id);
  }

  if (path.startsWith("/admin/history/") && method === "DELETE") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    const id = path.split("/")[3];
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

  res.writeHead(404);
  res.end(JSON.stringify({ message: "Route tidak ditemukan" }));
};

module.exports = routes;
