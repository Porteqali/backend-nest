import { Document, Schema } from "mongoose";

export type UsanceTypeDocument = UsanceType & Document;

export const UsanceTypeSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["weekly", "monthly"],
        required: true,
    },
    minimumAmount: {
        type: Number,
        required: true,
    },
    paymentDayOfWeek: {
        type: Number,
        enum: ["sat", "sun", "mon", "tue", "wed", "thu"],
        default: "sat",
    },
    paymentDayOfMonth: {
        type: Number,
        default: 1,
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface UsanceType {
    _id: Schema.Types.ObjectId;
    label: string;
    group: string;
    type: string;
    createdAt: Date;
}
