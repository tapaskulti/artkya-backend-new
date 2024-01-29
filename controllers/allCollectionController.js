const collectionModel = require("../models/allCollection");

// create collection
exports.createCollection = async (req, res) => {
  try {
    const { title, description, type, visibility, userId } = req.body;

    const createCollection = await collectionModel.create(req.body);
    return res.status(201).send({
      success: true,
      message: "Collection Created Successfully",
      data: createCollection,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};
//  get all collection of a user

exports.getAllCollectionByUserId = async (req, res) => {
  try {
    const {userId } = req.query;

    const findCollection = await collectionModel.findOne({ userId })
    .populate("arts")

    return res.status(200).send({
        success: true,
        data: findCollection,
      });

  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// add art to collection

exports.addArtToCollection = async (req, res) => {
  try {
    const { artId, userId } = req.query;
    let updateCollection, totalItems;

    const findCollection = await collectionModel.findOne({ userId });
    if (findCollection.arts.includes(artId)) {
        return res.status(400).send({
          success: false,
          message: "Art Already Present In Collection",
        });
      } else {
        updateCollection = findCollection?.arts.push(artId);
      }

      if (updateCollection) {
        totalItems = await findCollection.arts.length;
        findCollection.totalItems = totalItems;
      }
  
      await findWishlist.save();

      return res.status(200).send({
        success: true,
        data: totalItems,
        message: "Art Addded Successfully",
      });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// remove art from collection

exports.removeArtFromCollection = async (req, res) => {
  try {
    const { artId, userId } = req.query;
    let totalItems;
    const findCollection = await collectionModel.findOne({ userId });

    findCollection.arts = findCollection.arts.filter((art) => {
      console.log(art.toString());
      art.toString() !== artId.toString();
    });

    totalItems = await findCollection.arts.length;
    findCollection.totalItems = totalItems;

    console.log(findCollection);
    console.log(totalItems);

    await findCollection.save();
    return res.status(200).send({
      success: true,
      data: totalItems,
      message: "Art Removed Successfully",
    });

  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};
