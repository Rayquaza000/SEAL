import mongoose from "mongoose";

const idSchema=mongoose.Schema({
    lastUserIdInSystem:{
        type:String,
        required:true
    },
    lastEnterpriseIdInSystem:{
        type:String,
        required:true
    },
    lastProcessIdInSystem:{
        type:String,
        required:true
    }
});

export const Id_data=mongoose.model("Id_data",idSchema);