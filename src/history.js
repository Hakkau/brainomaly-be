const fs = require("fs");
const path = "./data/history.json";

const loadHistory = () => {
  if (!fs.existsSync(path)) fs.writeFileSync(path, "[]");
  return JSON.parse(fs.readFileSync(path));
};

const saveHistory = (data) => {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
};

module.exports = { loadHistory, saveHistory };
