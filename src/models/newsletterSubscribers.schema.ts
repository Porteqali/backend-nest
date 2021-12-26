import { Document, Schema } from "mongoose";

export type NewsletterSubscriberDocument = NewsletterSubscriber & Document;

export const NewsletterSubscriberSchema = new Schema({
    email: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["active", "deactive"],
        default: "active",
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface NewsletterSubscriber {
    _id: Schema.Types.ObjectId;
    email: string;
    status: string;
    createdAt: Date;
}
