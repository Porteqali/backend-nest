import { Document, Schema } from "mongoose";
import { User } from "./users.schema";

export type WalletTransactionDocument = WalletTransaction & Document;

export const WalletTransactionSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        userFullname: { type: String, required: true },

        chargeAmount: { type: Number, default: 0, required: true },
        paidAmount: { type: Number, default: 0, required: true },
        transactionCode: { type: String },
        authority: { type: String, required: true },
        paymentMethod: { type: String, required: true },
        status: {
            type: String,
            enum: ["waiting_for_payment", "ok", "cancel", "error"],
            default: "waiting_for_payment",
        },
        error: { type: String },
        ip: { type: String },
        createdAt: {
            type: Date,
            default: new Date(Date.now()),
        },
    },
    {
        collection: "wallet_transactions",
    },
);

export interface WalletTransaction {
    _id: Schema.Types.ObjectId;
    user: User | Schema.Types.ObjectId;
    userFullname: string;
    chargeAmount: number;
    paidAmount: number;
    transactionCode?: string;
    authority: string;
    paymentMethod: string;
    status: string;
    error?: string;
    ip: string;
    createdAt: Date;
}
