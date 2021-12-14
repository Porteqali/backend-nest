import { Document, Schema } from "mongoose";
import { Article } from "./articles.schema";
import { Course } from "./courses.schema";
import { User } from "./users.schema";

export type CommentDocument = Comment & Document;

export const CommentSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    commentedOn: {
        type: String,
        enum: ["course", "article"],
    },
    commentedOnId: {
        type: Schema.Types.ObjectId,
        refPath: "commentedOn",
    },
    topComment: {
        type: Schema.Types.ObjectId,
        ref: "Comment",
    },
    text: { type: String, required: true },
    status: {
        type: String,
        enum: ["waiting_for_review", "active", "deactive"],
        default: "waiting_for_review",
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Comment {
    _id: Schema.Types.ObjectId;
    user: User | Schema.Types.ObjectId;
    commentedOn: string;
    commentedOnId: Course | Article | Schema.Types.ObjectId;
    topComment: Comment | Schema.Types.ObjectId;
    text: string;
    status: string;
    createdAt: Date;
}
