const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const artWorkSchema = new mongoose.Schema(
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
    artDetails: {
      type: ObjectId,
      ref: "user",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("artWork", artWorkSchema);
