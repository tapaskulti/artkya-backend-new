const express = require("express");
const { createArt, getAllArt, getArtById } = require("../controllers/artController");
const router = express.Router();


router.route("/createArt").post(createArt)
router.route("/getAllArt").get(getAllArt)
router.route("/getArtById").get(getArtById)


module.exports = router;
