const express = require("express");
const { registerUser, login, getAccessToken, authUser, getSingleUserDetailsWithId, getAllUsers } = require("../controllers/userController");
const router = express.Router();


router.route("/registerUser").post(registerUser)
router.route("/login").post(login)
router.route("/access_Token").get(getAccessToken);
router.route("/authUser").get(authUser);
router.route("/getSingleUserDetailsWithId").get(getSingleUserDetailsWithId);
router.route("/getAllUsers").get(getAllUsers);

module.exports = router;
