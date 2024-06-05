import mongoose from "mongoose";

const subcriptionSchema= new mongoose.Schema({
    suscriber:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId,
        ref:"Channel"
    }
},{timestamps:true})

export const Subcription=mongoose.model('Subcription',subcriptionSchema)