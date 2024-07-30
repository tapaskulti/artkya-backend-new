const express = require("express");
const {
  createArtist,
  updateArtistProfile,
  getArtistById,
  getAllArtByArtistId,
  updateProfileImages,
} = require("../controllers/artistController");
const router = express.Router();

router.route("/createArtist").post(createArtist);
router.route("/getArtistById").get(getArtistById);
router.route("/getAllArtByArtistId").get(getAllArtByArtistId);
router.route("/updateArtistProfile").patch(updateArtistProfile);
router.route("/updateProfileImages").patch(updateProfileImages);

module.exports = router;
