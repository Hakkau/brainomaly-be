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
  return new Promise((resolve, reject) => {
    // Tambahkan reject untuk error handling
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e); // Jika JSON.parse gagal
      }
    });
    request.on("error", (err) => {
      // Tangani error pada request stream
      reject(err);
    });
  });
};

// Register
const registerHandler = async (req, res) => {
  try {
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

    res.writeHead(201); // Berhasil membuat resource baru
    res.end(
      JSON.stringify({
        status: "success",
        message: "Register sukses",
        data: { userId: user._id },
      })
    );
  } catch (error) {
    console.error("Error di registerHandler:", error);
    res.writeHead(
      error.message.includes("Unexpected end of JSON input") ||
        error instanceof SyntaxError
        ? 400
        : 500
    ); // Handle JSON parse error
    res.end(
      JSON.stringify({
        status: "fail",
        message:
          error.message.includes("Unexpected end of JSON input") ||
          error instanceof SyntaxError
            ? "Payload tidak valid"
            : "Terjadi kesalahan pada server",
      })
    );
  }
};

// Login
const loginHandler = async (req, res) => {
  try {
    const data = await getRequestBody(req);
    const user = await User.findOne({ email: data.email });

    if (!user) {
      res.writeHead(401); // Ganti 404 ke 401 untuk kredensial tidak valid
      res.end(
        JSON.stringify({ status: "fail", message: "Email atau password salah" })
      );
      return;
    }

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      res.writeHead(401);
      res.end(
        JSON.stringify({ status: "fail", message: "Email atau password salah" })
      );
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
        status: "success",
        message: "Login berhasil",
        data: {
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
        },
      })
    );
  } catch (error) {
    console.error("Error di loginHandler:", error);
    res.writeHead(
      error.message.includes("Unexpected end of JSON input") ||
        error instanceof SyntaxError
        ? 400
        : 500
    );
    res.end(
      JSON.stringify({
        status: "fail",
        message:
          error.message.includes("Unexpected end of JSON input") ||
          error instanceof SyntaxError
            ? "Payload tidak valid"
            : "Terjadi kesalahan pada server",
      })
    );
  }
};

// Tambah History
const addHistoryHandler = async (req, res) => {
  upload.single("photo")(req, res, async function (err) {
    if (err) {
      res.writeHead(400);
      res.end(JSON.stringify({ status: "fail", message: err.message }));
      return;
    }

    try {
      const userId = req.user.id; // Diambil dari token setelah verifikasi
      const { result, score, notes } = req.body; // Ini adalah form data, bukan JSON

      if (!result) {
        res.writeHead(400);
        res.end(
          JSON.stringify({
            status: "fail",
            message: "Field result wajib diisi",
          })
        );
        return;
      }
      if (score === undefined || score === null || score === "") {
        res.writeHead(400);
        res.end(
          JSON.stringify({ status: "fail", message: "Field score wajib diisi" })
        );
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

      res.writeHead(201); // Berhasil membuat resource baru
      res.end(
        JSON.stringify({
          status: "success",
          message: "Hasil analisis berhasil ditambahkan",
          data: {
            historyId: history._id,
            imageUrl: history.imageUrl || null,
          },
        })
      );
    } catch (error) {
      console.error("Error di addHistoryHandler:", error);
      res.writeHead(500);
      res.end(
        JSON.stringify({
          status: "error",
          message: "Terjadi kesalahan pada server saat menambahkan history",
        })
      );
    }
  });
};

// Ambil Semua History (admin)
const getAllHistoryHandler = async (req, res) => {
  try {
    const histories = await History.find()
      .populate("userId", "name email")
      .sort({ date: -1 });
    res.writeHead(200);
    res.end(JSON.stringify({ status: "success", data: { histories } }));
  } catch (error) {
    console.error("Error di getAllHistoryHandler:", error);
    res.writeHead(500);
    res.end(
      JSON.stringify({
        status: "error",
        message: "Terjadi kesalahan pada server",
      })
    );
  }
};

// Ambil History Milik User (digunakan oleh user dan admin)
const getUserHistoryHandler = async (req, res, userId) => {
  try {
    const histories = await History.find({ userId }).sort({ date: -1 });
    if (!histories || histories.length === 0) {
      // Tetap kembalikan 200 OK dengan data kosong jika tidak ada history,
      // kecuali jika user tidak ditemukan (itu akan ditangani di getUserDetailWithHistoryHandler)
      res.writeHead(200);
      res.end(JSON.stringify({ status: "success", data: { histories: [] } }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify({ status: "success", data: { histories } }));
  } catch (error) {
    console.error("Error di getUserHistoryHandler:", error);
    res.writeHead(500);
    res.end(
      JSON.stringify({
        status: "error",
        message: "Terjadi kesalahan pada server",
      })
    );
  }
};

// Update History (Disesuaikan untuk menerima userId dan historyId)
const updateHistoryHandler = async (req, res, userId, historyId) => {
  try {
    const data = await getRequestBody(req);

    const query = { _id: historyId };
    // Jika userId diberikan (dari rute admin baru /admin/users/{userId}/history/{historyId}),
    // kita menambahkannya ke query untuk memastikan history yang diupdate benar-benar milik user tersebut.
    if (userId) {
      query.userId = userId;
    }

    // Cek apakah history ada sebelum update
    const historyToUpdate = await History.findOne(query);
    if (!historyToUpdate) {
      res.writeHead(404);
      const message = userId
        ? "History tidak ditemukan atau tidak sesuai dengan user yang bersangkutan"
        : "History tidak ditemukan";
      res.end(JSON.stringify({ status: "fail", message }));
      return;
    }

    // Lakukan update. { new: true } mengembalikan dokumen yang sudah diupdate.
    const updatedHistory = await History.findByIdAndUpdate(historyId, data, {
      new: true,
      runValidators: true,
    });

    res.writeHead(200);
    res.end(
      JSON.stringify({
        status: "success",
        message: "History berhasil diperbarui",
        data: { history: updatedHistory },
      })
    );
  } catch (error) {
    console.error("Error di updateHistoryHandler:", error);
    if (error.name === "ValidationError") {
      res.writeHead(400);
      res.end(JSON.stringify({ status: "fail", message: error.message }));
    } else if (
      error.message.includes("Unexpected end of JSON input") ||
      error instanceof SyntaxError
    ) {
      res.writeHead(400);
      res.end(
        JSON.stringify({ status: "fail", message: "Payload tidak valid" })
      );
    } else {
      res.writeHead(500);
      res.end(
        JSON.stringify({
          status: "error",
          message: "Terjadi kesalahan pada server",
        })
      );
    }
  }
};

// Hapus History (Disesuaikan untuk menerima userId dan historyId)
const deleteHistoryHandler = async (req, res, userId, historyId) => {
  try {
    const query = { _id: historyId };
    // Jika userId diberikan, tambahkan ke query untuk keamanan tambahan
    if (userId) {
      query.userId = userId;
    }

    const deletedHistory = await History.findOneAndDelete(query);

    if (!deletedHistory) {
      res.writeHead(404);
      const message = userId
        ? "History tidak ditemukan atau tidak sesuai dengan user yang bersangkutan"
        : "History tidak ditemukan";
      res.end(JSON.stringify({ status: "fail", message }));
      return;
    }

    // Hapus file gambar terkait jika ada
    if (deletedHistory.imageUrl) {
      const imagePath = path.join(__dirname, deletedHistory.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlink(imagePath, (err) => {
          if (err) {
            console.error("Gagal menghapus file gambar:", err);
            // Tidak mengembalikan error ke client karena history sudah terhapus dari DB
          } else {
            console.log("File gambar berhasil dihapus:", imagePath);
          }
        });
      }
    }

    res.writeHead(200);
    res.end(
      JSON.stringify({ status: "success", message: "History berhasil dihapus" })
    );
  } catch (error) {
    console.error("Error di deleteHistoryHandler:", error);
    res.writeHead(500);
    res.end(
      JSON.stringify({
        status: "error",
        message: "Terjadi kesalahan pada server",
      })
    );
  }
};

// Detail user + semua history-nya (khusus admin, dipanggil dari GET /admin/users/{userId}/history)
const getUserDetailWithHistoryHandler = async (req, res, userId) => {
  try {
    const user = await User.findById(userId).select("-password"); // userId sudah dari parameter path
    if (!user) {
      res.writeHead(404);
      res.end(
        JSON.stringify({ status: "fail", message: "User tidak ditemukan" })
      );
      return;
    }

    const histories = await History.find({ userId }).sort({ date: -1 });

    const responseData = {
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
        notes: h.notes,
        imageUrl: h.imageUrl,
        date: h.date,
      })),
    };

    res.writeHead(200);
    res.end(JSON.stringify({ status: "success", data: responseData }));
  } catch (error) {
    console.error("Error di getUserDetailWithHistoryHandler:", error);
    res.writeHead(500);
    res.end(
      JSON.stringify({
        status: "error",
        message: "Terjadi kesalahan pada server",
      })
    );
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
