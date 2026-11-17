import mongoose from "mongoose";
import Follow from "../models/follow.model.js";
import User from "../models/user.model.js";

// Get logged-in user's profile

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select(
        "firstName lastName email bio profilePicture coverPhoto isPrivate createdAt"
      )
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({
        following: user._id,
        status: "accepted",
      }),

      Follow.countDocuments({
        follower: user._id,
        status: "accepted",
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully.",
      user: {
        ...user,
        followersCount,
        followingCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to get profile.",
    });
  }
};


// Update logged-in user's profile
const updateMyProfile = async (req, res) => {
  try {
    const allowedFields = [
      "firstName",
      "lastName",
      "bio",
      "profilePicture",
      "coverPhoto",
      "isPrivate",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body?.[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one field to update.",
      });
    }

    if (
      updates.firstName !== undefined &&
      (typeof updates.firstName !== "string" ||
        !updates.firstName.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "First name cannot be empty.",
      });
    }

    if (
      updates.lastName !== undefined &&
      (typeof updates.lastName !== "string" ||
        !updates.lastName.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Last name cannot be empty.",
      });
    }

    if (
      updates.bio !== undefined &&
      (typeof updates.bio !== "string" || updates.bio.length > 250)
    ) {
      return res.status(400).json({
        success: false,
        message: "Bio must be text with a maximum of 250 characters.",
      });
    }

    if (
      updates.profilePicture !== undefined &&
      typeof updates.profilePicture !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Profile picture must be a valid URL string.",
      });
    }

    if (
      updates.coverPhoto !== undefined &&
      typeof updates.coverPhoto !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Cover photo must be a valid URL string.",
      });
    }

    if (
      updates.isPrivate !== undefined &&
      typeof updates.isPrivate !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "isPrivate must be true or false.",
      });
    }

    if (updates.firstName !== undefined) {
      updates.firstName = updates.firstName.trim();
    }

    if (updates.lastName !== undefined) {
      updates.lastName = updates.lastName.trim();
    }

    if (updates.bio !== undefined) {
      updates.bio = updates.bio.trim();
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).select(
      "firstName lastName email bio profilePicture coverPhoto isPrivate createdAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user,
    });
  } catch (error) {
    console.error("Update profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update profile.",
    });
  }
};


// Get another user's public profile

const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user = await User.findById(userId)
      .select(
        "firstName lastName bio profilePicture coverPhoto isPrivate createdAt"
      )
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check whether the viewer is the profile owner
    const isOwner = currentUserId.toString() === userId;

    // Check accepted follow relationship
    let isFollowing = false;

    if (!isOwner) {
      isFollowing = await Follow.exists({
        follower: currentUserId,
        following: user._id,
        status: "accepted",
      });
    }

    // Protect private profiles
    if (user.isPrivate && !isOwner && !isFollowing) {
      return res.status(200).json({
        success: true,
        isPrivate: true,
        isFollowing: false,
        message: "This account is private.",
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture,
        },
      });
    }

    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({
        following: user._id,
        status: "accepted",
      }),

      Follow.countDocuments({
        follower: user._id,
        status: "accepted",
      }),
    ]);

    return res.status(200).json({
      success: true,
      isPrivate: user.isPrivate,
      isFollowing,
      message: "User profile fetched successfully.",
      user: {
        ...user,
        followersCount,
        followingCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to get user profile.",
    });
  }
};



const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string" || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a search term.",
      });
    }

    const searchTerm = q.trim();

    if (searchTerm.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Search term cannot exceed 50 characters.",
      });
    }

    const users = await User.find({
      $or: [
        { firstName: { $regex: searchTerm, $options: "i" } },
        { lastName: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
      ],
    })
      .select("firstName lastName profilePicture bio")
      .limit(20)
      .sort({ firstName: 1 });

    return res.status(200).json({
      success: true,
      message: "Users found successfully.",
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Search users error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to search users.",
    });
  }
};


const followUser = async (req, res) => {
  try {
    const followerId = req.user._id;
    const followingId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(followingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (followerId.toString() === followingId) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself.",
      });
    }

    const targetUser = await User.findById(followingId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const existingFollow = await Follow.findOne({
      follower: followerId,
      following: followingId,
    });

    if (existingFollow) {
      return res.status(409).json({
        success: false,
        message: "Follow request already exists.",
      });
    }

    const status = targetUser.isPrivate ? "pending" : "accepted";

    await Follow.create({
      follower: followerId,
      following: followingId,
      status,
    });

    return res.status(201).json({
      success: true,
      message:
        status === "pending"
          ? "Follow request sent successfully."
          : "User followed successfully.",
      status,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Follow request already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to follow user.",
    });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const followerId = req.user._id;
    const followingId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(followingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (followerId.toString() === followingId) {
      return res.status(400).json({
        success: false,
        message: "You cannot unfollow yourself.",
      });
    }

    const deletedFollow = await Follow.findOneAndDelete({
      follower: followerId,
      following: followingId,
    });

    if (!deletedFollow) {
      return res.status(404).json({
        success: false,
        message: "Follow relationship not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User unfollowed successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to unfollow user.",
    });
  }
};


const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const followers = await Follow.find({
      following: userId,
      status: "accepted",
    })
      .populate("follower", "firstName lastName profilePicture bio")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: followers.length,
      followers: followers.map(item => item.follower),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to get followers.",
    });
  }
};

const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const following = await Follow.find({
      follower: userId,
      status: "accepted",
    })
      .populate("following", "firstName lastName profilePicture bio")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: following.length,
      following: following.map(item => item.following),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to get following.",
    });
  }
};


const getFollowRequests = async (req, res) => {
  try {
    const requests = await Follow.find({
      following: req.user._id,
      status: "pending",
    })
      .populate(
        "follower",
        "firstName lastName profilePicture bio"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests: requests.map((item) => ({
        requestId: item._id,
        user: item.follower,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to get follow requests.",
    });
  }
};


const acceptFollowRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid follow request ID.",
      });
    }

    const request = await Follow.findOne({
      _id: requestId,
      following: req.user._id,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Follow request not found.",
      });
    }

    request.status = "accepted";
    await request.save();

    return res.status(200).json({
      success: true,
      message: "Follow request accepted successfully.",
      request,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to accept follow request.",
    });
  }
};


const rejectFollowRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid follow request ID.",
      });
    }

    const request = await Follow.findOneAndDelete({
      _id: requestId,
      following: req.user._id,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Follow request not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Follow request rejected successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to reject follow request.",
    });
  }
};





export {
  getMyProfile,
  updateMyProfile,
  getUserProfile,
  searchUsers,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  
};
