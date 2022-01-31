import { Document, Schema } from "mongoose";

export type CollaborateRequestDocument = CollaborateRequest & Document;

export const CollaborateRequestSchema = new Schema({
    name: { type: String, required: true },
    family: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
    suggestiveRole: { type: String, required: true },
    description: { type: String, required: true },
    status: {
        type: String,
        enum: ["new", "viewed"],
        default: "new",
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface CollaborateRequest {
    _id: Schema.Types.ObjectId;
    name: string;
    family: string;
    mobile: string;
    email: string;
    suggestiveRole: string;
    description: string;
    status: string;
    createdAt: Date;
}
