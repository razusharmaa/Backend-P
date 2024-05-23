import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const GenerateRefreshAccessToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const AccessToken = user.generateAccessToken();
    const RefreshToken = user.generateRefreshToken();
    user.refreshToken = RefreshToken;

    await user.save({ validitionBeforeSave: false });

    return { AccessToken, RefreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh");
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
  if (
    [username || email, password].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Step 3 : Check the user exist in database
  const userCheck = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!userCheck) {
    throw new ApiError(404, "User doesn't exist");
  }
  // Step 4 : Check for the password
  const passwordCheck = await user.isPasswordCorrect(password);

  if (!passwordCheck) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // Step 5: Generate refresh & access token

  const { AccessToken, RefreshToken } = await GenerateRefreshAccessToken(
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
    .cookie("access_token", AccessToken, options)
    .cookie("refresh_token", RefreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: LoggedInUser, AccessToken, RefreshToken },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
 await User.findByIdAndUpdate(req.user._id, {
    $set: {
      refreshToken: undefined,
    },
  },
  {new:true}
);

const options={
  httpOnly:true,
  secure:true
}

  return res
  .status(200)
  .clearCookie("access_token",options)
  .clearCookie("refresh_token",options)
  .status(new ApiResponse(200,"User Logout Successfully"))
});

export { registerUser, loginUser, logoutUser };
