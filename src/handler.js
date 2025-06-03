const JWT = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const History = require("./models/History");

const JWT_SECRET = process.env.JWT_SECRET;

const path = require("path");
const fs = require("fs");
const multer = require("multer");

// Setup storage untuk upload gambar
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

// Filter hanya file gambar
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file gambar yang diperbolehkan"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
  fileFilter: fileFilter,
});

const getRequestBody = async (request) => {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => resolve(JSON.parse(body)));
  });
};

// Register
const registerHandler = async (req, res) => {
  const data = await getRequestBody(req);
  const existingUser = await User.findOne({ email: data.email });

  if (existingUser) {
    res.writeHead(400);
    res.end(JSON.stringify({ message: "Email sudah terdaftar" }));
    return;
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const user = new User({ ...data, password: hashedPassword });
  await user.save();

  res.writeHead(200);
  res.end(JSON.stringify({ message: "Register sukses", id: user._id }));
};

// Login
const loginHandler = async (req, res) => {
  const data = await getRequestBody(req);
  const user = await User.findOne({ email: data.email });

  if (!user) {
    res.writeHead(404);
    res.end(JSON.stringify({ message: "User tidak ditemukan" }));
    return;
  }

  const isValid = await bcrypt.compare(data.password, user.password);
  if (!isValid) {
    res.writeHead(401);
    res.end(JSON.stringify({ message: "Password salah" }));
    return;
  }

  const token = JWT.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.writeHead(200);
  res.end(
    JSON.stringify({
      message: "Login berhasil",
      token,
      user: {
        id: user._id,
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

// Tambah History
const addHistoryHandler = async (req, res) => {
  upload.single("photo")(req, res, async function (err) {
    if (err) {
      res.writeHead(400);
      res.end(JSON.stringify({ message: err.message }));
      return;
    }

    const userId = req.user.id;
    const { result, score, notes } = req.body;

    if (!result) {
      res.writeHead(400);
      res.end(JSON.stringify({ message: "Field result wajib diisi" }));
      return;
    }

    const history = new History({
      userId,
      result,
      score,
      notes,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
    });

    await history.save();

    res.writeHead(200);
    res.end(
      JSON.stringify({
        message: "Hasil analisis ditambahkan",
        id: history._id,
        file: history.imageUrl || null,
      })
    );
  });
};

// Ambil Semua History (admin)
const getAllHistoryHandler = async (req, res) => {
  const histories = await History.find().populate("userId", "name email");
  res.writeHead(200);
  res.end(JSON.stringify(histories));
};

// Ambil History Milik User
const getUserHistoryHandler = async (req, res, userId) => {
  const histories = await History.find({ userId });
  res.writeHead(200);
  res.end(JSON.stringify(histories));
};

// Update History
const updateHistoryHandler = async (req, res, id) => {
  const data = await getRequestBody(req);
  const updated = await History.findByIdAndUpdate(id, data, { new: true });

  if (!updated) {
    res.writeHead(404);
    res.end(JSON.stringify({ message: "History tidak ditemukan" }));
    return;
  }

  res.writeHead(200);
  res.end(JSON.stringify({ message: "History diperbarui", updated }));
};

// Hapus History
const deleteHistoryHandler = async (req, res, id) => {
  const deleted = await History.findByIdAndDelete(id);

  if (!deleted) {
    res.writeHead(404);
    res.end(JSON.stringify({ message: "History tidak ditemukan" }));
    return;
  }

  res.writeHead(200);
  res.end(JSON.stringify({ message: "History dihapus" }));
};

// Detail user + semua history-nya (khusus admin)
const getUserDetailWithHistoryHandler = async (req, res, userId) => {
  try {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      res.writeHead(404);
      res.end(JSON.stringify({ message: "User tidak ditemukan" }));
      return;
    }

    const histories = await History.find({ userId }).sort({ date: -1 });

    const response = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        birthPlace: user.birthPlace,
        birthDate: user.birthDate,
        gender: user.gender,
      },
      histories: histories.map((h) => ({
        id: h._id,
        result: h.result,
        score: h.score,
        imageUrl: h.imageUrl,
        date: h.date,
      })),
    };

    res.writeHead(200);
    res.end(JSON.stringify(response));
  } catch (error) {
    console.error("Error:", error);
    res.writeHead(500);
    res.end(JSON.stringify({ message: "Terjadi kesalahan server" }));
  }
};

module.exports = {
  registerHandler,
  loginHandler,
  addHistoryHandler,
  getAllHistoryHandler,
  getUserHistoryHandler,
  updateHistoryHandler,
  deleteHistoryHandler,
  getUserDetailWithHistoryHandler,
};
