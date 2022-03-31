import { Document, Schema } from "mongoose";
import { Bundle } from "./bundles.schema";

export type MajorDocument = Major & Document;

export const MajorSchema = new Schema({
    image: { type: String },
    slug: { type: String, required: true },
    title: { type: String, required: true },
    desc: { type: String, required: true },
    text: { type: String, required: true },
    bundles: [{ type: Schema.Types.ObjectId, ref: "Bundle" }],
    metadata: new Schema({
        thumbnail: { type: String },
        title: { type: String },
        description: { type: String },
        author: { type: String },
        keywords: { type: String },
    }),
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Major {
    _id: Schema.Types.ObjectId;
    image: string;
    slug: string;
    title: string;
    desc: string;
    text: string;
    bundles: Array<Bundle | Schema.Types.ObjectId>;
    metadata: MetaData;
    createdAt: Date;
}

export interface MetaData {
    _id?: Schema.Types.ObjectId;
    thumbnail: string;
    title: string;
    description: string;
    author: string;
    keywords?: string;
}
