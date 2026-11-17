
import mongoose from "mongoose";
import Bookmark from "../models/bookmark.model.js";
import Post from "../models/post.model.js";
import Follow from "../models/follow.model.js";

// Check whether a user can access a post
const canAccessPost = async (post, userId) => {
  const isOwner = post.author._id.toString() === userId.toString();

  if (isOwner) return true;

  const isFollower = await Follow.exists({
    follower: userId,
    following: post.author._id,
    status: "accepted",
  });

  if (post.author.isPrivate && !isFollower) return false;

  if (post.visibility === "followers" && !isFollower) return false;

  return true;
};

// SAVE POST
const savePost = async (req, res) => {
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

    const allowed = await canAccessPost(post, req.user._id);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You cannot save this post.",
      });
    }

    const existingBookmark = await Bookmark.findOne({
      user: req.user._id,
      post: postId,
    });

    if (existingBookmark) {
      return res.status(409).json({
        success: false,
        message: "You have already saved this post.",
      });
    }

    const bookmark = await Bookmark.create({
      user: req.user._id,
      post: postId,
    });

    return res.status(201).json({
      success: true,
      message: "Post saved successfully.",
      bookmark,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already saved this post.",
      });
    }

    console.error("Save post error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save post.",
    });
  }
};

// REMOVE SAVED POST
const removeSavedPost = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID.",
      });
    }

    const bookmark = await Bookmark.findOneAndDelete({
      user: req.user._id,
      post: postId,
    });

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        message: "Saved post not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Saved post removed successfully.",
    });
  } catch (error) {
    console.error("Remove saved post error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove saved post.",
    });
  }
};

// GET SAVED POSTS
const getSavedPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const bookmarks = await Bookmark.find({
      user: req.user._id,
    })
      .populate({
        path: "post",
        populate: {
          path: "author",
          select: "firstName lastName profilePicture isPrivate",
        },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Do not expose posts that the user can no longer access
    const accessibleBookmarks = [];

    for (const bookmark of bookmarks) {
      if (!bookmark.post || !bookmark.post.author) continue;

      const allowed = await canAccessPost(
        bookmark.post,
        req.user._id
      );

      if (allowed) {
        accessibleBookmarks.push(bookmark);
      }
    }

    const totalBookmarks = await Bookmark.countDocuments({
      user: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Saved posts fetched successfully.",
      count: accessibleBookmarks.length,
      totalBookmarks,
      currentPage: page,
      totalPages: Math.ceil(totalBookmarks / limit),
      savedPosts: accessibleBookmarks,
    });
  } catch (error) {
    console.error("Get saved posts error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch saved posts.",
    });
  }
};

export {
  savePost,
  removeSavedPost,
  getSavedPosts,
};
