import { Document, Schema } from "mongoose";
import { User } from "./users.schema";

export type ArticleCategoryDocument = ArticleCategory & Document;

export const ArticleCategorySchema = new Schema({
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    name: {
        type: String,
        unique: true,
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface ArticleCategory {
    _id: Schema.Types.ObjectId;
    author: User | Schema.Types.ObjectId;
    name: string;
    createdAt: Date;
}
