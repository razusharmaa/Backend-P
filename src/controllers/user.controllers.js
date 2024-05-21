import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
  // Get the user details from frontend
  // Validations : not empty
  // Check if the user exists : username, email
  // Check for the images, check for avatar
  // Upload them to cloudinary , avatar
  // Create user object - create entry in db
  // Remove password and refresh token field from response
  // Check for user creation
  // Return response


  // Step 1 : Get the user details from frontend

  const {fullname,email,username,password}=req.body;
  console.log("Username: " + username);


  // Step 2 : Validations - not empty

  if ([fullname,email,username,password].some((field)=>{field?.trim()===''})) {
    throw new ApiError(400,"All fields are required")
  } 

  // Step 3 : Check if the user exists : username, email

  const existedUser= User.findOne({
    $or: [
      {username},
      {email}
    ]
  })

  if (existedUser) {
    throw new ApiError(409,"User already exists")
  }

  // Step 4 : Check for the images, check for avatar

  const AvatarLocalPath= req.files?.avatar[0]?.path
  const CoverLocalPath= req.files?.cover[0]?.path

  if (!AvatarLocalPath) {
    throw new ApiError(400,'Avatar photo is required')
  }

  // Step 5: Upload them to cloudinary , avatar

  const Avatar= await uploadOnCloudinary(AvatarLocalPath)
  const Cover= await uploadOnCloudinary(CoverLocalPath)

  if (!Avatar) {
    throw new ApiError(400,'Avatar photo is required')
  }

  // Step 6:  Create user object - create entry in db
  
 const user=await User.create({
    fullname,
    email,
    username:username.toLowerCase(),
    password,
    avatar:Avatar.url,
    cover:Cover?.url|| ""
  })

  // Step 7: Remove password and refresh token field from response

  const createdUser= await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if (!createdUser) {
    throw new ApiError(500,'Something went wrong while registering the user')
  }

  // Last Step: Return response
  return response.status(201).json(
    new ApiResponse(200,createdUser,'User registered successfully')
  )





});

export {registerUser}