const UserModel = require("../model/user")

const authAdmin = async(req,res,next) =>{
try {
    //console.log(req.user)
    const user = await UserModel.findById({_id:req.user._id})
    
    if(user.role !== "ADMIN"){
        return res.status(401).send({message:"Admin resources access denied"})
    }
    next()
} catch (error) {
    return res.status(500).send({success:false,message:error.message})
}
}

module.exports = authAdmin