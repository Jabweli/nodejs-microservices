import mongoose from "mongoose";
import argon2 from "argon2";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  try {
    if (this.isModified("password")) {
      this.password = await argon2.hash(this.password);
    }
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword){
  try {
    return await argon2.verify(this.password, candidatePassword);
  } catch (error) {
    throw error
  }
}

userSchema.index({username: "text"})

export const User = mongoose.model("User", userSchema)
