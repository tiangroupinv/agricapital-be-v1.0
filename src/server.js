require("dotenv").config();
const app = require("./app");
const { connect } = require("./database");

const PORT = process.env.PORT || 5000;

async function start() {
  await connect();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();
