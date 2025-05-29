const express = require("express");
const {
  buyOriginalArtMail,
  getTotalUsersAndArtists,
  getAllUsers,
  getAllArtists,
  toggleUserStatus,
  verifyArtist,
  rejectArtwork,
  approveArtwork,
  getAllPainting,
  updateArtistCommission,
} = require("../controllers/adminController");
const router = express.Router();

router.route("/contactUs").post(buyOriginalArtMail);
router.route("/getTotalUsersAndArtists").get(getTotalUsersAndArtists);
router.route("/getAllUsers").get(getAllUsers);
router.route("/getAllArtists").get(getAllArtists);
router.route("/toggleUserStatus").patch(toggleUserStatus);
router.route("/updateCommission").patch(updateArtistCommission);
router.route("/verifyArtist").patch(verifyArtist);
router.route("/rejectArtwork").patch(rejectArtwork);
router.route("/approveArtwork").patch(approveArtwork);
router.route("/getAllPainting").get(getAllPainting);


module.exports = router;
