
import mongoose from "mongoose";
import Like from "../models/like.model.js";
import Post from "../models/post.model.js";
import Follow from "../models/follow.model.js";

// 1. LIKE A POST
const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID.",
      });
    }

    const post = await Post.findById(postId).populate(
      "author",
      "_id isPrivate"
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const isOwner =
      post.author._id.toString() === userId.toString();

    const isAcceptedFollower = await Follow.exists({
      follower: userId,
      following: post.author._id,
      status: "accepted",
    });

    if (
      !isOwner &&
      (post.author.isPrivate || post.visibility === "followers") &&
      !isAcceptedFollower
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot like this post.",
      });
    }

    const existingLike = await Like.findOne({
      user: userId,
      post: postId,
    });

    if (existingLike) {
      return res.status(409).json({
        success: false,
        message: "You have already liked this post.",
      });
    }

    await Like.create({
      user: userId,
      post: postId,
    });

    const likesCount = await Like.countDocuments({
      post: postId,
    });

    return res.status(201).json({
      success: true,
      message: "Post liked successfully.",
      likesCount,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already liked this post.",
      });
    }

    console.error("Like post error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to like post.",
    });
  }
};


// 2. UNLIKE A POST
const unlikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID.",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const deletedLike = await Like.findOneAndDelete({
      user: userId,
      post: postId,
    });

    if (!deletedLike) {
      return res.status(404).json({
        success: false,
        message: "You have not liked this post.",
      });
    }

    const likesCount = await Like.countDocuments({
      post: postId,
    });

    return res.status(200).json({
      success: true,
      message: "Post unliked successfully.",
      likesCount,
    });
  } catch (error) {
    console.error("Unlike post error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to unlike post.",
    });
  }
};


// 3. GET USERS WHO LIKED A POST
const getPostLikes = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID.",
      });
    }

    const post = await Post.findById(postId).populate(
      "author",
      "_id isPrivate"
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const userId = req.user._id;

    const isOwner =
      post.author._id.toString() === userId.toString();

    const isAcceptedFollower = await Follow.exists({
      follower: userId,
      following: post.author._id,
      status: "accepted",
    });

    if (
      !isOwner &&
      (post.author.isPrivate || post.visibility === "followers") &&
      !isAcceptedFollower
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot view likes on this post.",
      });
    }

    const likes = await Like.find({
      post: postId,
    })
      .populate("user", "firstName lastName profilePicture")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: likes.length,
      likes,
    });
  } catch (error) {
    console.error("Get post likes error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch post likes.",
    });
  }
};

export {
  likePost,
  unlikePost,
  getPostLikes,
};
