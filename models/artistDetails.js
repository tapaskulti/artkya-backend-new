const mongoose = require("mongoose");

const artistDetailSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    info: {
      type: String,
    },
    education: [{ type: String }],
    exibition: [{ type: String }],
    events: [{ type: String }],
    dob: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("artistDetails", artistDetailSchema);
