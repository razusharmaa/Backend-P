import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const GenerateRefreshAccessToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating tokens:", error);
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

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

  const { fullname, email, username, password } = req.body;
  console.log("Username: " + username);

  // Step 2 : Validations - not empty

  if (
    [fullname, email, username, password].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Step 3 : Check if the user exists : username, email

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  // Step 4 : Check for the images, check for avatar

  const AvatarLocalPath = req.files?.avatar[0]?.path;
  // const CoverLocalPath= req.files?.coverImage[0]?.path

  let CoverLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    CoverLocalPath = req.files.coverImage[0].path;
  }

  console.log(CoverLocalPath);

  if (!AvatarLocalPath) {
    throw new ApiError(400, "Avatar photo is required");
  }

  // Step 5: Upload them to cloudinary , avatar

  const Avatar = await uploadOnCloudinary(AvatarLocalPath);
  const Cover = await uploadOnCloudinary(CoverLocalPath);

  console.log(Avatar);

  if (!Avatar) {
    throw new ApiError(400, "Avatar file  is required");
  }

  // Step 6:  Create user object - create entry in db

  const user = await User.create({
    fullname,
    email,
    username: username.toLowerCase(),
    password,
    avatar: Avatar.url,
    coverImage: Cover?.url || "",
  });

  // Step 7: Remove password and refresh token field from response

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // Last Step: Return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // Get the user details from frontend
  // Validations : not empty
  // Check the user exist in database
  // Check for the password
  // Create refresh & access token
  // Send cookies
  // Remove password and refresh token field from response
  // Return response

  // Step 1 : Get the user details from frontend
  const { email, username, password } = req.body;

  // Step 2 : Validations - not empty

  if (![email || username, password].every(Boolean)) {
    throw new ApiError(400, "All fields are required");
  }

  // Step 3 : Check the user exist in database
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!user) {
    throw new ApiError(404, "User doesn't exist");
  }
  // Step 4 : Check for the password
  const passwordCheck = await user.isPasswordCorrect(password);

  if (!passwordCheck) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // Step 5: Generate refresh & access token

  const { accessToken, refreshToken } = await GenerateRefreshAccessToken(
    user._id
  );

  const LoggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("access_token", accessToken, options)
    .cookie("refresh_token", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: LoggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("access_token", options)
    .clearCookie("refresh_token", options)
    .json(new ApiResponse(200, "User Logout Successfully"));
});

 const RefreshAccessToken = asyncHandler(async (req, res) => {

  try {
 // Step 1: Get the refresh token
 const incomingRefreshToken = req.cookies?.refresh_token || req.body.refresh_token;

 // Log the incoming refresh token for debugging
 console.log('Incoming Refresh Token:', incomingRefreshToken);

  if (!incomingRefreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }

  
    // Step 2: Verify the refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    console.log(decodedToken);

    // Step 3: Extract user info from decoded token
    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Step 4: Match refresh token
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // Step 5: Generate new access and refresh tokens
    const { accessToken, refreshToken } = await GenerateRefreshAccessToken(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    // Step 6: Send new access and refresh tokens
    return res
      .status(200)
      .cookie("access_token", accessToken, options)
      .cookie("refresh_token", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Refresh Token updated successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error.message || "Invalid refresh token");
  }
});

export { registerUser, loginUser, logoutUser, RefreshAccessToken };
