const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const imageSchema = new mongoose.Schema(
  {
    art: {
      id: {
        type: String,
      },
      secure_url: {
        type: String,
      },
    },
    artist: {
        type: ObjectId,
        ref: "user",
      },
  },
  { timestamps: true }
);

module.exports = mongoose.model("image", imageSchema);