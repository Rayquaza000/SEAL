import { Id_data } from "../Model/ids.model.js";
import { User_data } from "../Model/users.model.js";
import bcrypt from "bcrypt";
export async function signupNewUser(req,res){
    try{
        const checkifemailalreadyexists=await User_data.find({email:req.body.userEmail});
        if(checkifemailalreadyexists)
        {
            return res.json(500).json({"message":"Email already exists"});
        }
        const newUser=new User_data();
        const lastId=Id_data.findOne();
        const lastUserId=lastId.lastUserIdInSystem;
        const newUserId=lastUserId.slice(0,4)+(parseInt(lastUserId.slice(4,))+1).toString();
        await Id_data.findOneAndUpdate({lastUserIDInSystem:lastUserId},{lastUserIDInSystem:newUserId});
        newUser.userID=newUserId;
        newUser.userName=req.body.userName;
        newUser.userEmail=req.body.userEmail;
        newUser.userMobile=req.body.userMobile;
        newUser.userPassword=bcrypt.hashSync(req.body.userPassword,10);
        newUser.userProfilePic=req.body.userProfilePic;
        newUser.save().then(()=>{return res.status(200).json({"message":"New user signup successfull"})}).catch((error)=>{return res.status(500).json({"error":error})});
    }
    catch(err){
        return res.status(500).json({"error":err});
    }
}