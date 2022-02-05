import { Document, Schema } from "mongoose";
import { User } from "./users.schema";

export type LinkDocument = Link & Document;

export const LinkSchema = new Schema({
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    external: { type: String, required: true },
    internal: { type: String, required: true },
    description: { type: String },
    usedFor: {
        type: String,
        enum: ["general", "courseVideo"],
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Link {
    _id: Schema.Types.ObjectId;
    author: User | Schema.Types.ObjectId;
    external: string;
    internal: string;
    description: string;
    usedFor: string;
    createdAt: Date;
}
