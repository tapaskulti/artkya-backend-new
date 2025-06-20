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
  getAllOrdersAdmin,
  updateOrderStatus,
} = require("../controllers/adminController");
const router = express.Router();

router.route("/contactUs").post(buyOriginalArtMail);
router.route("/getTotalUsersAndArtists").get(getTotalUsersAndArtists);
router.route("/getAllUsers").get(getAllUsers);
router.route("/getAllArtists").get(getAllArtists);
router.route("/getAllPainting").get(getAllPainting);
router.route("/toggleUserStatus").patch(toggleUserStatus);
router.route("/updateCommission").patch(updateArtistCommission);
router.route("/verifyArtist").patch(verifyArtist);
router.route("/rejectArtwork").patch(rejectArtwork);
router.route("/approveArtwork").patch(approveArtwork);
router.route("/getAllOrdersAdmin").get(getAllOrdersAdmin);
router.route("/updateOrderStatus/:orderId/status").patch(updateOrderStatus);


module.exports = router;
