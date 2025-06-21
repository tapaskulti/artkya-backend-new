const express = require("express");
const {
  buyOriginalArtMail,
  getTotalUsersAndArtists,
  getAllUsers,
  getAllArtists,
  verifyArtist,
  rejectArtwork,
  approveArtwork,
  getAllPainting,
  updateArtistCommission,
  getAllOrdersAdmin,
  updateOrderStatus,
  updatePaintingStatus,
  deletePainting,
  exportPaintings,
  getPaintingAnalytics,
  bulkApprovePaintings,
  getPaintingDetails,
  getArtistDetails,
  updateArtistStatus,
  getArtistAnalytics,
  exportArtists,
  toggleArtApprovalPermission,
} = require("../controllers/adminController");
const router = express.Router();

router.route("/contactUs").post(buyOriginalArtMail);
router.route("/getTotalUsersAndArtists").get(getTotalUsersAndArtists);
router.route("/getAllUsers").get(getAllUsers);



router.get('/artists', getAllArtists);
router.get('/artists/analytics', getArtistAnalytics);
router.get('/artists/export', exportArtists);
router.get('/artists/:artistId', getArtistDetails);
router.patch('/artists/:artistId/verify', verifyArtist);
router.patch('/artists/:artistId/status', updateArtistStatus);
router.patch('/artists/:artistId/art-approval', toggleArtApprovalPermission);
router.patch('/artists/:artistId/commission', updateArtistCommission);


router.route("/rejectArtwork").patch(rejectArtwork);
router.route("/approveArtwork").patch(approveArtwork);
router.route("/getAllOrdersAdmin").get(getAllOrdersAdmin);
router.route("/updateOrderStatus/:orderId/status").patch(updateOrderStatus);

router.route("/getAllPainting").get(getAllPainting);
router.patch('/admin/paintings/:artId/status', updatePaintingStatus);
router.delete('/admin/paintings/:artId', deletePainting);
router.get('/admin/paintings/export', exportPaintings);
router.get('/admin/paintings/analytics', getPaintingAnalytics);
router.get('/admin/paintings/bulk-approve', bulkApprovePaintings);
router.patch('/admin/paintings/:artId', getPaintingDetails);

module.exports = router;
