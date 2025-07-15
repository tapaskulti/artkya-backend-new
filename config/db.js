const mongoose = require("mongoose");

const connectWithMongodb = async (req, res) => {
  try {
    console.log("mongo url===>",process.env.MONGO_URL)
    mongoose.set("strictQuery", false);
    mongoose
      .connect(process.env.MONGO_URL)
      mongoose.connection
      .once("open", () => {
        console.log("Connected to mongodb");
      })
      .on("error", (error) => {
        console.log("Error connecting to mongodb", error);
      });
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = connectWithMongodb;