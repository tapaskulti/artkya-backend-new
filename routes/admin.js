const express = require("express");
const { contactUs } = require("../controllers/adminController");
const router = express.Router();

router.route("/contactUs").post(contactUs);


module.exports = router;
