
const express = require("express");
const { removeArtFromCollection, addArtToCollection, getAllCollectionByUserId, createCollection } = require("../controllers/CollectionController");

const router = express.Router();

router.route("/createCollection").post(createCollection)
router.route("/addArtToCollection").patch(addArtToCollection)
router.route("/removeArtFromCollection").patch(removeArtFromCollection)
router.route("/getAllCollectionByUserId").get(getAllCollectionByUserId)

module.exports = router;