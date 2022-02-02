import { Document, Schema } from "mongoose";
import { ArticleCategory } from "./articleCategories.schema";
import { User } from "./users.schema";

export type ArticleDocument = Article & Document;

export const ArticleSchema = new Schema({
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    image: { type: String },
    imageVertical: { type: String },
    inTextImageList: [{ type: String }],
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    body: { type: String, required: true },
    category: {
        type: Schema.Types.ObjectId,
        ref: "ArticleCategory",
    },
    tags: [{ type: String }],
    metadata: new Schema({
        thumbnail: { type: String },
        title: { type: String },
        description: { type: String },
        author: { type: String },
        keywords: { type: String },
    }),
    url_code: {
        type: String,
    },
    status: {
        type: String,
        enum: ["published", "pending"],
    },
    likes: {
        type: Number,
        default: 0,
    },
    publishedAt: { type: Date },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Article {
    _id: Schema.Types.ObjectId;
    author: User | Schema.Types.ObjectId;
    image?: string;
    imageVertical?: string;
    inTextImageList?: string[];
    title: string;
    slug: string;
    description: string;
    body: string;
    category: ArticleCategory | Schema.Types.ObjectId;
    tags?: string[];
    metadata: MetaData;
    url_code?: string;
    status: string;
    likes: number;
    publishedAt: Date;
    createdAt: Date;
}

export interface MetaData {
    _id?: Schema.Types.ObjectId;
    thumbnail: string;
    title: string;
    description: string;
    author: string;
    keywords: string;
}
