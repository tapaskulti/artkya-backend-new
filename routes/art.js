const express = require("express");
const {
  createArt,
  getAllArt,
  getArtById,
  getArtByName,
  getArtByArtist,
  filterArt, 
  payment,
  updateArt,
  deleteArt,
} = require("../controllers/artController");
const router = express.Router();

router.route("/createArt").post(createArt);
router.route("/getAllArt").get(getAllArt);
router.route("/getArtById").get(getArtById);
router.route("/getArtByName").get(getArtByName);
router.route("/getArtByArtist").get(getArtByArtist);
router.route("/filterArt").post(filterArt);
router.route("/deleteArt").delete(deleteArt);
router.route("/updateArt").patch(updateArt);
router.route("/payment").get(payment);

module.exports = router;
