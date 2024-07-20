const express = require("express");
const { createArtist } = require("../controllers/artistController");
const router = express.Router();

router.route("/createArt").post(createArtist);




module.exports = router;