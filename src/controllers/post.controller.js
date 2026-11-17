
import mongoose from "mongoose";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Follow from "../models/follow.model.js";

// 1. CREATE POST
const createPost = async (req, res) => {
  try {
    const { content, media, visibility } = req.body;

    if (
      (content !== undefined && typeof content !== "string") ||
      (media !== undefined && !Array.isArray(media)) ||
      (visibility !== undefined && typeof visibility !== "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid post data.",
      });
    }

    const postContent = content?.trim() || "";
    const postMedia = media || [];

    if (!postContent && postMedia.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A post must contain text or media.",
      });
    }

    if (postContent.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Post content cannot exceed 5000 characters.",
      });
    }

    if (postMedia.length > 10) {
      return res.status(400).json({
        success: false,
        message: "You can attach a maximum of 10 media files.",
      });
    }

    const selectedVisibility = visibility || "public";

    if (!["public", "followers"].includes(selectedVisibility)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post visibility.",
      });
    }

    const newPost = await Post.create({
      author: req.user._id,
      content: postContent,
      media: postMedia,
      visibility: selectedVisibility,
    });

    const populatedPost = await Post.findById(newPost._id)
      .populate("author", "firstName lastName profilePicture");

    return res.status(201).json({
      success: true,
      message: "Post created successfully.",
      post: populatedPost,
    });
  } catch (error) {
    console.error("Create post error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create post.",
    });
  }
};

// 2. GET A SINGLE POST
const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID.",
      });
    }

    const post = await Post.findById(postId)
      .populate("author", "firstName lastName profilePicture isPrivate");

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const isOwner = post.author._id.toString() === req.user._id.toString();

    const isPrivateAccount = post.author.isPrivate;

    const isAcceptedFollower = await Follow.exists({
      follower: req.user._id,
      following: post.author._id,
      status: "accepted",
    });

    if (
      !isOwner &&
      (isPrivateAccount || post.visibility === "followers") &&
      !isAcceptedFollower
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this post.",
      });
    }

    return res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    console.error("Get post error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch post.",
    });
  }
};

// 3. UPDATE YOUR POST
const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, media, visibility } = req.body;

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

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own posts.",
      });
    }

    if (
      (content !== undefined && typeof content !== "string") ||
      (media !== undefined && !Array.isArray(media)) ||
      (visibility !== undefined && typeof visibility !== "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid post data.",
      });
    }

    if (content !== undefined) {
      post.content = content.trim();
    }

    if (media !== undefined) {
      post.media = media;
    }

    if (visibility !== undefined) {
      post.visibility = visibility;
    }

    if (!["public", "followers"].includes(post.visibility)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post visibility.",
      });
    }

    if (post.content.length > 5000 || post.media.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Post content or media limit exceeded.",
      });
    }

    if (!post.content.trim() && post.media.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A post must contain text or media.",
      });
    }

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate("author", "firstName lastName profilePicture");

    return res.status(200).json({
      success: true,
      message: "Post updated successfully.",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Update post error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update post.",
    });
  }
};

// 4. DELETE YOUR POST
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

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

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own posts.",
      });
    }

    await post.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully.",
    });
  } catch (error) {
    console.error("Delete post error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete post.",
    });
  }
};


// 5. GET NEWS FEED
const getFeedPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const skip = (page - 1) * limit;
    const currentUserId = req.user._id;

    // Find users whom the current user follows
    const acceptedFollows = await Follow.find({
      follower: currentUserId,
      status: "accepted",
    }).select("following");

    const followedUserIds = acceptedFollows.map(
      (follow) => follow.following
    );

    // Feed includes own posts and accepted followed users' posts
    const visibleAuthorIds = [
      currentUserId,
      ...followedUserIds,
    ];

    // Get public users and private users followed by current user
    const followedUsers = await User.find({
      _id: { $in: followedUserIds },
    }).select("_id isPrivate");

    const allowedPrivateUserIds = followedUsers
      .filter((user) => user.isPrivate)
      .map((user) => user._id);

    // Public posts from followed users and current user
    const posts = await Post.find({
      $or: [
        {
          author: currentUserId,
        },
        {
          author: {
            $in: followedUserIds,
          },
          visibility: "public",
        },
        {
          author: {
            $in: allowedPrivateUserIds,
          },
          visibility: "followers",
        },
      ],
    })
      .populate("author", "firstName lastName profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments({
      $or: [
        { author: currentUserId },
        {
          author: {
            $in: followedUserIds,
          },
          visibility: "public",
        },
        {
          author: {
            $in: allowedPrivateUserIds,
          },
          visibility: "followers",
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Feed fetched successfully.",
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        limit,
        hasNextPage: page * limit < totalPosts,
      },
      posts,
    });
  } catch (error) {
    console.error("Get feed error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch feed.",
    });
  }
};


 // 6. GET POSTS BY USER
const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const profileUser = await User.findById(userId)
      .select("_id isPrivate");

    if (!profileUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const currentUserId = req.user._id;

    const isOwner =
      currentUserId.toString() === userId;

    const isAcceptedFollower = await Follow.exists({
      follower: currentUserId,
      following: userId,
      status: "accepted",
    });

    if (profileUser.isPrivate && !isOwner && !isAcceptedFollower) {
      return res.status(403).json({
        success: false,
        message: "This account is private.",
      });
    }

    const page = Math.max(
      1,
      parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const skip = (page - 1) * limit;

    const query = {
      author: userId,
      ...(isOwner || isAcceptedFollower
        ? {}
        : { visibility: "public" }),
    };

    const [posts, totalPosts] = await Promise.all([
      Post.find(query)
        .populate(
          "author",
          "firstName lastName profilePicture"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Post.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "User posts fetched successfully.",
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        limit,
        hasNextPage: page * limit < totalPosts,
      },
      posts,
    });
  } catch (error) {
    console.error("Get user posts error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch user posts.",
    });
  }
};



export {
  createPost,
  getPostById,
  updatePost,
  deletePost,
  getFeedPosts,
  getUserPosts,
};

