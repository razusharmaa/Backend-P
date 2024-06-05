import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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
    const incomingRefreshToken =
      req.cookies?.refresh_token || req.body.refresh_token;

    // Log the incoming refresh token for debugging
    console.log("Incoming Refresh Token:", incomingRefreshToken);

    if (!incomingRefreshToken) {
      throw new ApiError(400, "Refresh token is required");
    }

    // Step 2: Verify the refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Step 3: Extract user info from decoded token
    const user = await User.findById(decodedToken._id).select("-password");
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

const changePassword = asyncHandler(async (req, res, next) => {
  // Step 1: Get the current password and new password
  const { currentPassword, newPassword } = req.body;

  // Step 2: Check for validation
  if (!currentPassword || !newPassword) {
    throw new ApiError(401, "All fields are required");
  }

  // Step 3: Extract refresh token from cookie
  const incomingRefreshToken =
    req.cookies?.refresh_token || req.body.refresh_token;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  try {
    // Step 4: Decode the refresh token to get user ID
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Step 5: Get the user from DB
    const user = await User.findById(decodedToken._id).select("-refreshToken");
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Step 6: Check whether the password is correct
    const passwordCheck = await user.isPasswordCorrect(currentPassword);
    if (!passwordCheck) {
      throw new ApiError(400, "Invalid current password");
    }

    // Step 7: Update the password
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    // Step 8: Return response
    return res
      .status(200)
      .json(new ApiResponse(200, "Password changed successfully"));
  } catch (error) {
    console.error("Error changing password:", error.message);
    throw new ApiError(401, error.message || "Invalid refresh token");
  }
});

const changeAvatar = asyncHandler(async (req, res) => {
  // Step 1: Get the avatar image
  const newAvatar = req.file?.path;

  // Step 2: Check for avatar image
  if (!newAvatar) {
    throw new ApiError(400, "Avatar photo is required");
  }

  // Step 3: Extract refresh token from cookie or body
  const incomingRefreshToken =
    req.cookies?.refresh_token || req.body.refresh_token;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  try {
    // Step 4: Decode the refresh token to get user ID
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Upload the new avatar image to Cloudinary
    const avatar = await uploadOnCloudinary(newAvatar);

    // Step 5: Get the user from DB and update the avatar image
    const user = await User.findByIdAndUpdate(
      decodedToken._id,
      { $set: { avatar: avatar.url } },
      { new: true }
    ).select("-password -refreshToken");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Step 6: Return response
    return res
      .status(200)
      .json(new ApiResponse(200, user, "Avatar changed successfully"));
  } catch (error) {
    console.error("Error updating avatar:", error.message);
    throw new ApiError(401, error.message || "Invalid refresh token");
  }
});

const changeCover = asyncHandler(async (req, res) => {
  // Step 1: Get the cover image
  const newCover = req.file?.path;

  // Step 2: Check for cover image
  if (!newCover) {
    throw new ApiError(400, "Cover photo is required");
  }

  // Step 3: Extract refresh token from cookie or body
  const incomingRefreshToken =
    req.cookies?.refresh_token || req.body.refresh_token;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  try {
    // Step 4: Decode the refresh token to get user ID
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Upload the new cover image to Cloudinary
    const cover = await uploadOnCloudinary(newCover);

    // Step 5: Get the user from DB and update the cover image
    const user = await User.findByIdAndUpdate(
      decodedToken._id,
      { $set: { coverImage: cover.url } },
      { new: true }
    ).select("-password -refreshToken");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Step 6: Return response
    return res
      .status(200)
      .json(new ApiResponse(200, user, "Cover changed successfully"));
  } catch (error) {
    console.error("Error updating cover:", error.message);
    throw new ApiError(401, error.message || "Invalid refresh token");
  }
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  // Step 1: Validate the username
  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  // Step 2: Aggregate data
  const channel = await User.aggregate([
    // Match the username in lowercase
    { $match: { username: username.toLowerCase() } },
    // Look up subscribers
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    // Look up channels this user is subscribed to
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    // Add computed fields
    {
      $addFields: {
        subscriberCount: { $size: "$subscribers" },
        channelSubscribedTo: { $size: "$subscribedTo" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    // Project the fields to return
    {
      $project: {
        username: 1,
        avatar: 1,
        coverImage: 1,
        subscriberCount: 1,
        channelSubscribedTo: 1,
        isSubscribed: 1,
        subscribers: 0,
        subscribedTo: 0,
      },
    },
  ]);

  // Step 3: Return the response
  if (channel.length === 0) {
    throw new ApiError(404, "Channel not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "Channel profile retrieved successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "videoWatchHistory",
        pipeline: [
          {
            $lookup: {
              from: "videos",
              localField: "owner",
              foreignField: "_id",
              as: "videoOwner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);
});

export {
  registerUser,
  loginUser,
  logoutUser,
  RefreshAccessToken,
  changePassword,
  changeAvatar,
  changeCover,
  getUserChannelProfile,
};
