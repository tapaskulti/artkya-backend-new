const express = require("express");
const {
  contactUs,
  buyOriginalArtMail,
  getTotalUsersAndArtists,
  getAllUsers,
  getAllArtists,
  updatePrintCommission,
  toggleUserStatus,
  verifyArtist,
  rejectArtwork,
  approveArtwork,
} = require("../controllers/adminController");
const router = express.Router();

router.route("/contactUs").post(buyOriginalArtMail);
router.route("/getTotalUsersAndArtists").get(getTotalUsersAndArtists);
router.route("/getAllUsers").get(getAllUsers);
router.route("/getAllArtists").get(getAllArtists);
router.route("/toggleUserStatus").patch(toggleUserStatus);
router.route("/updatePrintCommission").post(updatePrintCommission);
router.route("/verifyArtist").patch(verifyArtist);
router.route("/rejectArtwork").patch(rejectArtwork);
router.route("/approveArtwork").patch(approveArtwork);

module.exports = router;
