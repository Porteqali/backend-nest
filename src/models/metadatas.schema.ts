import { Document, Schema } from "mongoose";
import { User } from "./users.schema";

export type MetadataDocument = Metadata & Document;

export const MetadataSchema = new Schema({
    page: { type: String, unique: true },

    image: { type: String },
    title: { type: String, required: true },
    description: { type: String, required: true },
    keywords: { type: String, required: true },
    canonical: { type: String, required: true },
    themeColor: { type: String, required: true },
    site: { type: String, required: true },
    language: { type: String, required: true },

    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Metadata {
    _id: Schema.Types.ObjectId;
    page: string;

    image?: string;
    title: string;
    description: string;
    keywords: string;
    canonical: string;
    themeColor: string;
    site: string;
    language: string;

    createdAt: Date;
}
