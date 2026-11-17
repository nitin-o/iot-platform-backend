
import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
  },
  { timestamps: true }
);

// A user can bookmark a post only once
bookmarkSchema.index(
  { user: 1, post: 1 },
  { unique: true }
);

// Efficiently retrieve a user's bookmarks
bookmarkSchema.index({ user: 1, createdAt: -1 });

const Bookmark = mongoose.model("Bookmark", bookmarkSchema);

export default Bookmark;
