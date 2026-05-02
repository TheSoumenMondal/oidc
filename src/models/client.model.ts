import type { Document } from "mongoose";
import mongoose from "mongoose";

interface IClient extends Document {
  appName: string;
  appUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUrls: string;
}

const clientSchema = new mongoose.Schema<IClient>(
  {
    appName: {
      type: String,
      required: true,
    },
    appUrl: {
      type: String,
      required: true,
    },
    clientId: {
      type: String,
      required: true,
      unique: true,
    },
    clientSecret: {
      type: String,
      required: true,
    },
    redirectUrls: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Client = mongoose.model("Client", clientSchema);

export { Client };
