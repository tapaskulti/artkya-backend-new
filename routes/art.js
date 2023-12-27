const express = require("express");
const { createArt } = require("../controllers/artController");
const router = express.Router();


router.route("/createArt").post(createArt)


module.exports = router;
