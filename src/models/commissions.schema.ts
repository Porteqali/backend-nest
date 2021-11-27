import { Document, Schema } from "mongoose";

export type CommissionDocument = Commission & Document;

export const CommissionSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["percent", "number"],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Commission {
    _id: Schema.Types.ObjectId;
    name: string;
    type: string;
    amount: number;
    createdAt: Date;
}
