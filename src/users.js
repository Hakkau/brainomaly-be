const fs = require("fs");
const path = "./data/users.json";

const loadUsers = () => {
  if (!fs.existsSync(path)) fs.writeFileSync(path, "[]");
  return JSON.parse(fs.readFileSync(path));
};

const saveUsers = (data) => {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
};

module.exports = { loadUsers, saveUsers };
