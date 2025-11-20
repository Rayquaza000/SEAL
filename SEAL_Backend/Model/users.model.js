import mongoose from "mongoose";

const userSchema=mongoose.Schema({
    userID:{
        type:String,
        required:true
    },
    userName:{
        type:String,
        required:true
    },
    userEmail:{
        type:String,
        required:true
    },
    userMobile:{
        type:String,
        required:true
    },
    userPassword:{
        type:String,
        required:true
    },
    userProfilePic:{
        type:String,
        required:true
    },
    enterprisesInvolvedIn:{
        type:Array,
        default:[]
    }
});

export const User_data=mongoose.model("User_data",userSchema);