const {
  registerHandler,
  loginHandler,
  addHistoryHandler,
  getAllHistoryHandler,
  getUserHistoryHandler,
  updateHistoryHandler, // Handler ini akan disesuaikan untuk menerima userId dan historyId
  deleteHistoryHandler, // Handler ini akan disesuaikan untuk menerima userId dan historyId
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

  // Admin akses semua history (Tidak berubah)
  if (path === "/admin/history" && method === "GET") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    console.log(`[ADMIN] ${user.email} mengakses ${path}`);
    return getAllHistoryHandler(req, res);
  }

  // BARU: Admin akses detail user + semua history-nya
  // GET /admin/users/{userId}/history
  const userDetailRegex = /^\/admin\/users\/([a-zA-Z0-9]+)\/history$/;
  if (userDetailRegex.test(path) && method === "GET") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    const userId = path.split("/")[3];
    console.log(
      `[ADMIN] ${user.email} mengakses ${path} untuk userId: ${userId}`
    );
    return getUserDetailWithHistoryHandler(req, res, userId);
  }

  // BARU: Admin update history user tertentu
  // PUT /admin/users/{userId}/history/{historyId}
  const adminUpdateHistoryRegex =
    /^\/admin\/users\/([a-zA-Z0-9]+)\/history\/([a-zA-Z0-9]+)$/;
  if (adminUpdateHistoryRegex.test(path) && method === "PUT") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    const parts = path.split("/");
    const userId = parts[3];
    const historyId = parts[5];
    console.log(
      `[ADMIN] ${user.email} mengakses ${path} untuk userId: ${userId}, historyId: ${historyId}`
    );
    return updateHistoryHandler(req, res, userId, historyId); // Meneruskan userId dan historyId
  }

  // BARU: Admin delete history user tertentu
  // DELETE /admin/users/{userId}/history/{historyId}
  const adminDeleteHistoryRegex =
    /^\/admin\/users\/([a-zA-Z0-9]+)\/history\/([a-zA-Z0-9]+)$/;
  if (adminDeleteHistoryRegex.test(path) && method === "DELETE") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    const parts = path.split("/");
    const userId = parts[3];
    const historyId = parts[5];
    console.log(
      `[ADMIN] ${user.email} mengakses ${path} untuk userId: ${userId}, historyId: ${historyId}`
    );
    return deleteHistoryHandler(req, res, userId, historyId); // Meneruskan userId dan historyId
  }

  // USER ROUTES (Tidak berubah)
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

  // GENERIC ROUTES
  // Rute-rute ini mungkin perlu ditinjau ulang atau dihapus jika fungsionalitasnya
  // sudah dicakup oleh rute admin yang lebih spesifik atau jika tidak lagi diperlukan.
  // Untuk saat ini, saya membiarkan mereka tetapi dengan catatan bahwa handler mungkin perlu penyesuaian.

  // GET /history (Admin Akses Semua History - sama seperti /admin/history)
  if (path === "/history" && method === "GET") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    return getAllHistoryHandler(req, res);
  }

  // POST /history (User Tambah History - sama seperti /user/history)
  if (path === "/history" && method === "POST") {
    const userToken = verifyToken(req, res, "user"); // Menggunakan nama variabel yang berbeda
    if (!userToken) return;
    req.user = userToken; // Pastikan req.user di-set dengan benar
    return addHistoryHandler(req, res);
  }

  // GET /history/user/{userId} (User akses history sendiri atau Admin akses)
  const userHistoryGenericRegex = /^\/history\/user\/([a-zA-Z0-9]+)$/;
  if (userHistoryGenericRegex.test(path) && method === "GET") {
    const userAccessing = verifyToken(req, res); // Bisa user atau admin
    if (!userAccessing) return;
    const targetUserId = path.split("/")[3];
    // Hanya user yang bersangkutan atau admin yang boleh akses
    if (userAccessing.role !== "admin" && userAccessing.id !== targetUserId) {
      res.writeHead(403);
      return res.end(JSON.stringify({ message: "Akses ditolak" }));
    }
    return getUserHistoryHandler(req, res, targetUserId);
  }

  // PUT /history/{historyId} (Admin update history tanpa userId di path)
  const genericUpdateHistoryRegex = /^\/history\/([a-zA-Z0-9]+)$/;
  if (genericUpdateHistoryRegex.test(path) && method === "PUT") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    const historyId = path.split("/")[2];
    // Untuk rute ini, userId tidak ada di path.
    // Handler updateHistoryHandler akan menerima userId sebagai null.
    return updateHistoryHandler(req, res, null, historyId);
  }

  // DELETE /history/{historyId} (Admin delete history tanpa userId di path)
  const genericDeleteHistoryRegex = /^\/history\/([a-zA-Z0-9]+)$/;
  if (genericDeleteHistoryRegex.test(path) && method === "DELETE") {
    const user = verifyToken(req, res, "admin");
    if (!user) return;
    const historyId = path.split("/")[2];
    // Sama seperti PUT di atas, userId akan null.
    return deleteHistoryHandler(req, res, null, historyId);
  }

  res.writeHead(404);
  res.end(JSON.stringify({ message: "Route tidak ditemukan" }));
};

module.exports = routes;
