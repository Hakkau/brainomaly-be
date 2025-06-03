const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  result: { type: String, required: true },
  notes: { type: String },
  score: {
    type: Number,
    required: false,
  },
  imageUrl: { type: String },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("History", historySchema);
