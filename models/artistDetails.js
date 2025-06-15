const mongoose = require("mongoose");


const artistDetailSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    profileImage: {
      id: {
        type: String,
      },
      secure_url: {
        type: String,
      },
    },
    coverPhoto: {
      id: {
        type: String,
      },
      secure_url: {
        type: String,
      },
    },
    studioImage: {
      id: {
        type: String,
      },
      secure_url: {
        type: String,
      },
    },
    aboutMe: {
      type: String,
    },
    customUrl: {
      type: String,
    },
    // education: [{ type: String }],
    education: { type: String },
    // exibition: [{ type: String }],
    exibition: { type: String },
    // events: [{ type: String }],
    events: { type: String },
    dob: {
      type: String,
    },
    country: {
      type: String,
    },
    state: {
      type: String,
    },
    city: {
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
    printOption: {
      type: String,
    },
    originalPercent: {
      type: Number,
      default: 20,
    },
    // printPercent: {
    //   type: Number,
    //   default: 0,
    // },
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("artistDetails", artistDetailSchema);
