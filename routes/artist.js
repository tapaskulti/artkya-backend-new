const express = require("express");
const { createArtist, updateArtistProfile, getArtistById } = require("../controllers/artistController");
const router = express.Router();

router.route("/createArtist").post(createArtist);
router.route("/getArtistById").get(getArtistById);
router.route("/updateArtistProfile").patch(updateArtistProfile);




module.exports = router;