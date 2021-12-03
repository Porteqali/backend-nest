import { Document, Schema } from "mongoose";

export type ContactRequestDocument = ContactRequest & Document;

export const ContactRequestSchema = new Schema({
    name: { type: String, required: true },
    family: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
    issue: { type: String, required: true },
    message: { type: String, required: true },
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

export interface ContactRequest {
    _id: Schema.Types.ObjectId;
    name: string;
    family: string;
    mobile: string;
    email: string;
    issue: string;
    message: string;
    status: string;
    createdAt: Date;
}
