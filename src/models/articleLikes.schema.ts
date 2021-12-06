import { Document, Schema } from "mongoose";
import { Article } from "./articles.schema";
import { User } from "./users.schema";

export type ArticleLikeDocument = ArticleLike & Document;

export const ArticleLikeSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    article: {
        type: Schema.Types.ObjectId,
        ref: "Article",
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface ArticleLike {
    _id: Schema.Types.ObjectId;
    user: User | Schema.Types.ObjectId;
    article: Article | Schema.Types.ObjectId;
    createdAt: Date;
}
