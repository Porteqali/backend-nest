import { Document, Schema } from "mongoose";

export type TestimonialDocument = Testimonial & Document;

export const TestimonialSchema = new Schema({
    image: { type: String },
    fullname: { type: String },
    title: { type: String },
    comment: {
        type: String,
        required: true,
    },
    showAs: {
        type: String,
        required: true,
        enum: ["teacher", "user"],
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Testimonial {
    _id: Schema.Types.ObjectId;
    image: string;
    fullname: string;
    title: string;
    comment: string;
    showAs: string;
    createdAt: Date;
}
