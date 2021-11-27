import { Document, Schema } from "mongoose";
import { User } from "./users.schema";

export type FaqDocument = Faq & Document;

export const FaqSchema = new Schema({
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    group: {
        type: String,
        enum: ["education", "support", "collab", "wallet"],
    },
    status: {
        type: String,
        enum: ["published", "pending"],
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Faq {
    _id: Schema.Types.ObjectId;
    author: User | Schema.Types.ObjectId;
    question: string;
    answer: string;
    group: string;
    status: string;
    createdAt: Date;
}
