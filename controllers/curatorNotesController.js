const CNotes = require("../models/curatorNotes")

exports.createCNotes = async(req,res)=>{
    try {
        
        const createNotes = await CNotes.create(req.body)

        if(!createNotes){
            return res.status(401).send({success: false, message: "C.notes Not Created" })
        }
        return res
        .status(201)
        .send({
          success: true,
          message: "Curator Notes created successfully",
          data: createNotes,
        });
    } catch (error) {
        return res.status(500).send({ success: false, message: error.message });
    }
}