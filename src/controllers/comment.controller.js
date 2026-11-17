
import mongoose from "mongoose";
import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import Follow from "../models/follow.model.js";

// Check whether the current user can access a post
const canAccessPost = async (post, userId) => {
  const isOwner = post.author._id.toString() === userId.toString();

  if (isOwner) return true;

  const isFollower = await Follow.exists({
    follower: userId,
    following: post.author._id,
    status: "accepted",
  });

  // Private account posts are visible only to accepted followers
  if (post.author.isPrivate && !isFollower) return false;

  // Followers-only posts are visible only to accepted followers
  if (post.visibility === "followers" && !isFollower) return false;

  return true;
};

// CREATE COMMENT
const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID.",
      });
    }

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required.",
      });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 2000 characters.",
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
        message: "You cannot comment on this post.",
      });
    }

    const comment = await Comment.create({
      post: postId,
      author: req.user._id,
      content: content.trim(),
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      "author",
      "firstName lastName profilePicture"
    );

    return res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      comment: populatedComment,
    });
  } catch (error) {
    console.error("Create comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add comment.",
    });
  }
};

// GET COMMENTS
const getPostComments = async (req, res) => {
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
        message: "You cannot view comments on this post.",
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 20)
    );

    const comments = await Comment.find({ post: postId })
      .populate("author", "firstName lastName profilePicture")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalComments = await Comment.countDocuments({
      post: postId,
    });

    return res.status(200).json({
      success: true,
      message: "Comments fetched successfully.",
      count: comments.length,
      totalComments,
      currentPage: page,
      totalPages: Math.ceil(totalComments / limit),
      comments,
    });
  } catch (error) {
    console.error("Get comments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch comments.",
    });
  }
};

// UPDATE YOUR COMMENT
const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID.",
      });
    }

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required.",
      });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 2000 characters.",
      });
    }

    const comment = await Comment.findOne({
      _id: commentId,
      author: req.user._id,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or you are not its author.",
      });
    }

    comment.content = content.trim();
    await comment.save();

    const updatedComment = await Comment.findById(comment._id).populate(
      "author",
      "firstName lastName profilePicture"
    );

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully.",
      comment: updatedComment,
    });
  } catch (error) {
    console.error("Update comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update comment.",
    });
  }
};

// DELETE YOUR COMMENT
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID.",
      });
    }

    const comment = await Comment.findOneAndDelete({
      _id: commentId,
      author: req.user._id,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or you are not its author.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
    });
  } catch (error) {
    console.error("Delete comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete comment.",
    });
  }
};

export {
  createComment,
  getPostComments,
  updateComment,
  deleteComment,
};
