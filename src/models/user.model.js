
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 250,
    },

    profilePicture: {
      type: String,
      default: "",
    },

    coverPhoto: {
      type: String,
      default: "",
    },
    isActive: {
  type: Boolean,
  default: true,
},

    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password
userSchema.methods.isPasswordCorrect = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Generate access token
userSchema.methods.generateAccessToken = function (sessionId) {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      sid: sessionId,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
    }
  );
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function (sessionId) {
  return jwt.sign(
    {
      _id: this._id,
      sid: sessionId,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
    }
  );
};  

const User = mongoose.model("User", userSchema);

export default User;
