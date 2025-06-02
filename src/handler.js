const fs = require("fs");
const JWT = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { loadUsers, saveUsers } = require("./users");
const { loadHistory, saveHistory } = require("./history");

const JWT_SECRET = "rahasia_super_aman"; // Ganti pakai .env di produksi

const getRequestBody = async (request) => {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => resolve(JSON.parse(body)));
  });
};

// Register
const registerHandler = async (request, response) => {
  const data = await getRequestBody(request);
  const users = loadUsers();

  if (users.some((u) => u.email === data.email)) {
    response.writeHead(400);
    response.end(JSON.stringify({ message: "Email sudah terdaftar" }));
    return;
  }

  const id = Date.now().toString();
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const newUser = {
    id,
    ...data,
    password: hashedPassword,
  };

  users.push(newUser);
  saveUsers(users);

  response.writeHead(200);
  response.end(JSON.stringify({ message: "Register sukses", id }));
};

// Login
const loginHandler = async (request, response) => {
  const data = await getRequestBody(request);
  const users = loadUsers();

  const user = users.find((u) => u.email === data.email);
  if (!user) {
    response.writeHead(404);
    response.end(JSON.stringify({ message: "User tidak ditemukan" }));
    return;
  }

  const isValid = await bcrypt.compare(data.password, user.password);
  if (!isValid) {
    response.writeHead(401);
    response.end(JSON.stringify({ message: "Password salah" }));
    return;
  }

  const token = JWT.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify({
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        birthPlace: user.birthPlace,
        birthDate: user.birthDate,
        gender: user.gender,
      },
    })
  );
};

// Tambah History (user)
const addHistoryHandler = async (request, response) => {
  const data = await getRequestBody(request);
  const history = loadHistory();

  const id = Date.now().toString();
  history.push({ id, ...data, date: new Date().toISOString() });
  saveHistory(history);

  response.writeHead(200);
  response.end(JSON.stringify({ message: "Hasil analisis ditambahkan", id }));
};

// Ambil semua history (admin)
const getAllHistoryHandler = (_, response) => {
  const history = loadHistory();
  response.writeHead(200);
  response.end(JSON.stringify(history));
};

// Ambil history user tertentu
const getUserHistoryHandler = (request, response, userId) => {
  const history = loadHistory().filter((h) => h.userId === userId);
  response.writeHead(200);
  response.end(JSON.stringify(history));
};

// Update history (admin)
const updateHistoryHandler = async (request, response, id) => {
  const data = await getRequestBody(request);
  let history = loadHistory();

  const index = history.findIndex((h) => h.id === id);
  if (index === -1) {
    response.writeHead(404);
    response.end(JSON.stringify({ message: "History tidak ditemukan" }));
    return;
  }

  history[index] = { ...history[index], ...data };
  saveHistory(history);
  response.writeHead(200);
  response.end(JSON.stringify({ message: "History diperbarui" }));
};

// Hapus history (admin)
const deleteHistoryHandler = (request, response, id) => {
  let history = loadHistory();
  history = history.filter((h) => h.id !== id);
  saveHistory(history);
  response.writeHead(200);
  response.end(JSON.stringify({ message: "History dihapus" }));
};

module.exports = {
  registerHandler,
  loginHandler,
  addHistoryHandler,
  getAllHistoryHandler,
  getUserHistoryHandler,
  updateHistoryHandler,
  deleteHistoryHandler,
};
