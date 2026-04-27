import type { Document } from "mongoose";
import mongoose from "mongoose";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  hashPassword: string;
  profilePicture?: string;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    hashPassword: {
      type: String,
      required: true,
      select: false,
    },
    profilePicture: {
      type: String,
    },
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>("User", userSchema);

export { User };
