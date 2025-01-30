const express = require("express");
const {
  contactUs,
  buyOriginalArtMail,
} = require("../controllers/adminController");
const router = express.Router();

router.route("/contactUs").post(buyOriginalArtMail);

module.exports = router;
