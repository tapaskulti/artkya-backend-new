const collectionModel = require("../models/collection")

// create collection
    exports.createCollection = (req,res)=>{
        try {
            const{title,description,type,visibility} = req.body
            

            
        } catch (error) {
            return res.status(500).send({ success: false, message: error.message });
        }
    }
//  get all collection of a user

exports.getAllCollection = (req,res)=>{
    try {
        
    } catch (error) {
        return res.status(500).send({ success: false, message: error.message });
    }
}

// add art to collection

exports.addArtToCollection = (req,res)=>{
    try {
        
    } catch (error) {
        return res.status(500).send({ success: false, message: error.message });
    }
}


// remove art from collection

exports.removeArtToColection = (req,res)=>{
    try {
        
    } catch (error) {
        return res.status(500).send({ success: false, message: error.message });
    }
}