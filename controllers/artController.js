const cloudinary = require("cloudinary");
const artDetailModel = require("../models/art");
const artWorkModel = require("../models/artWork");
const userModel = require("../models/user");

exports.createArt = async (req, res) => {
  try {
    let uploadedImage;
    let thumbnailFile;

    const creatingArt = await artDetailModel.create(req.body);

    if (req.files?.images) {
      console.log("req.files?.images------->", req.files?.images);
      req.files?.images?.forEach(async (singleImage) => {
        uploadedImage = await cloudinary.v2.uploader.upload(
          singleImage.tempFilePath,
          { folder: "Arts_Images" }
        );
        console.log("uploadedImage------->", uploadedImage);

        if (uploadedImage) {
          const creatingImage = await artWorkModel.create({
            art: {
              id: uploadedImage?.public_id,
              secure_url: uploadedImage?.secure_url,
            },
            artist: req.body.artist,
            artDetails: creatingArt?._id,
          });

          if (creatingImage) {
            await artDetailModel.findOneAndUpdate(
              { _id: creatingArt?._id },
              { $push: { arts: creatingImage?._id } }
            );
          }
        }
      });
    }

    if (req.files.thumbnail) {
      thumbnailFile = await cloudinary.v2.uploader.upload(
        req.files.thumbnail.tempFilePath,
        { folder: "Arts_Images" }
      );
    }

    console.log("thumbnail------->", req.files.thumbnail);
    console.log("thumbnailFile------->", thumbnailFile);

    const imageThumbnail = thumbnailFile && {
      id: thumbnailFile.public_id,
      secure_url: thumbnailFile.secure_url,
    };

    if (imageThumbnail) {
      await artDetailModel.findOneAndUpdate(
        { _id: creatingArt?._id },
        { thumbnail: imageThumbnail }
      );
    }

     res.status(201).send({
      success: true,
      message: "Art Created Successfully",
    });


    // push art id in user Art
    await userModel.findOneAndUpdate({_id:req.body.artist},{$push:{art:creatingArt._id}})


  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// exports.createArt = async (req, res) => {
//   try {
//     let uploadedImage;
//     console.log("req.files?.images------->", req.files?.images);
//     if (req.files?.images) {
//       req.files?.images?.forEach(async (singleImage) => {
//         uploadedImage = await cloudinary.v2.uploader.upload(
//           singleImage.tempFilePath,
//           { folder: "Arts_Images" }
//         );
//         console.log("uploadedImage------->", uploadedImage);
//         const art = uploadedImage?.secure_url

//         if (uploadedImage) {
//           req.body.art = art;
//           await artDetailModel.create(req.body);

//           return res.status(201).send({
//             success: true,
//             message: "Art Created Successfully",
//           });
//         }
//       });
//     }
//     return res.status(400).send({ status: false, message: "Art Not Created" });
//   } catch (error) {
//     return res.status(500).send({ success: false, message: error.message });
//   }
// };

// Get All Arts
exports.getAllArt = async (req, res) => {
  try {
    const allArts = await artDetailModel.find()
    // .select({arts:-1})
    if (allArts) {
      return res.status(200).send({ success: true, data: allArts });
    }
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// Get Art By Id
exports.getArtById = async (req, res) => {
  try {
    const { artID } = req.query;
    const allArts = await artDetailModel.find({ _id: artID });
    if (allArts) {
      return res.status(200).send({ success: true, data: allArts });
    }
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};


// Searching By ART AND ARTIST

exports.getArtByName= async(req,res)=>{
  try {
    const{artByName}= req.query
    let findArt
    if(artByName){
      // findArt = await artDetailModel.aggregate([ { $match: { title: artByName} } ])
      findArt = await artDetailModel.find({title:{$regex:artByName , $options: 'i' }})
    }

    if(!findArt){
      return res.status(400).send({success:false,message:"art not found"})
    }

    return res.status(200).send({success:true,data:findArt})
      

  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
} 


exports.getArtByArtist = async(req,res)=>{
  try {
    const{artist}= req.query
    let artByName,artByArtist
    
    console.log(artist.split(" ").join(""))

    const queryArtist = artist.split(" ").join("")
    
    const [firstName, lastName] = artist.split(' ');

    const  findUser = await userModel.find({
      $and: [{ firstName }, { lastName }]

    })
    console.log("findUser--->>",findUser)


    
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
} 



// filter 

