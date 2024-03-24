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
    country: {
      type: String,
    },
    isVerified: {
      type: Boolean,
    },
    isArtApprovalReq: {
      type: Boolean,
    },
    isActive: {
      type: Boolean,
    },
    featuredArtist: {
      type: Boolean,
    },
    artistFeaturedDesignation: {
      type: String,
      enum: [
        "ARTKYA_ART_CATLOG",
        "INSIDE_THE_STUDIO",
        "RISING_STARS",
        "ONE_TO_WATCH",
        "THE_OTHER_ART_FAIR",
      ],
    },
    artistNotes: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "artistNotes",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("artistDetails", artistDetailSchema);
