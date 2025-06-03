const JWT = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = (req, res, requiredRole = null) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    res.writeHead(401);
    res.end(JSON.stringify({ message: "Token tidak ditemukan" }));
    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = JWT.verify(token, JWT_SECRET);
    if (requiredRole && decoded.role !== requiredRole) {
      res.writeHead(403);
      res.end(
        JSON.stringify({ message: `Akses ditolak (bukan ${requiredRole})` })
      );
      return null;
    }
    return decoded;
  } catch (err) {
    res.writeHead(401);
    res.end(JSON.stringify({ message: "Token tidak valid" }));
    return null;
  }
};

module.exports = { verifyToken };
