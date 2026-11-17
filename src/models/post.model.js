
import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    // User who created the post
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Text content of the post
    content: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    // Images or videos attached to the post
    media: [
      {
        url: {
          type: String,
          required: true,
          trim: true,
        },

        mediaType: {
          type: String,
          enum: ["image", "video"],
          required: true,
        },
      },
    ],

    // Post visibility
    visibility: {
      type: String,
      enum: ["public", "followers"],
      default: "public",
    },
  },
  {
    timestamps: true,
  }
);

// Efficiently fetch posts by author, newest first
postSchema.index({ author: 1, createdAt: -1 });

// Efficiently fetch recent posts
postSchema.index({ createdAt: -1 });

const Post = mongoose.model("Post", postSchema);

export default Post;
