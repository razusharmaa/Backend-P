import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";


export const VerfiyJWT= asyncHandler(async(req,res,next)=>{
  try {
     const token= req.cookie?.AccessToken || req.header("Authorization")?.replace('Bearer ','')
     
     if (!token) {
      throw new ApiError(401,"Unathorized request")
     }
  
     const DecodedToken= jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
  
   const user= await User.findById(DecodedToken?._id).select("-password -refreshToken")
  
   if (!user){
      // next video, discuss about frontend
      throw new ApiError(401," Invalid access token")
  
      req.user=user
      next()
   }
  } catch (error) {
    throw new ApiError(401,error?.message || "Invalid access token")
  }
})