import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

export const VerifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // Extract the token from either the cookies or the Authorization header
    const token = req.cookies?.access_token || req.header("Authorization")?.replace('Bearer ', '');
    console.log(token);
    
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Find the user by the decoded token's _id
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    // Assign the user to req.user
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
