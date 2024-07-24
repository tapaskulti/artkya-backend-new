const express = require("express");
const { createArtist } = require("../controllers/artistController");
const router = express.Router();

router.route("/createArtist").post(createArtist);




module.exports = router;