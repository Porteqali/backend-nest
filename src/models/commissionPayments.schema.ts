import { Document, Schema } from "mongoose";
import { User } from "./users.schema";

export type FaqDocument = Faq & Document;

export const FaqSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    commissionAmountBeforePayment: {
        type: Number,
        required: true,
    },
    payedAmount: {
        type: Number,
        required: true,
    },
    commissionAmountAfterPayment: {
        type: Number,
        required: true,
    },
    cardNumber: { type: String },
    bank: { type: String },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Faq {
    _id: Schema.Types.ObjectId;
    user: User | Schema.Types.ObjectId;
    commissionAmountBeforePayment: number;
    payedAmount: number;
    commissionAmountAfterPayment: number;
    cardNumber: string;
    bank: string;
    createdAt: Date;
}
