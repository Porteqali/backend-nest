import { Document, Schema } from "mongoose";

export type AnalyticsCheckDocument = AnalyticsCheck & Document;

export const AnalyticsCheckSchema = new Schema({
    authority: { type: String, required: true },
    totalPrice: { type: Number, required: true },
    totalCuts: { type: Number, required: true },
    amountAdded: { type: Number, required: true },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface AnalyticsCheck {
    _id: Schema.Types.ObjectId;
    totalPrice: number;
    totalCuts: number;
    amountAdded: number;
    createdAt: Date;
}
