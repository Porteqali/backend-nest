import { Document, Schema } from "mongoose";
import { User } from "./users.schema";

export type AnalyticsDocument = Analytics & Document;

export const AnalyticsSchema = new Schema(
    {
        marketer: { type: Schema.Types.ObjectId, ref: "User" },
        teacher: { type: Schema.Types.ObjectId, ref: "User" },
        count: { type: Number, default: 0 },
        infoName: {
            type: String,
            // stored data: income(total, markter and teacher) new-users(total and marketer) sells(buy count - marketer only) link-clicked(marketer only)
            enum: ["income", "new-users", "sells", "link-clicked"],
            required: true,
        },
        forGroup: {
            type: String,
            enum: ["total", "marketer", "teacher"],
            required: true,
        },
        type: {
            type: String,
            enum: ["daily", "monthly"],
            required: true,
        },
        date: { type: Date },
        createdAt: {
            type: Date,
            default: new Date(Date.now()),
        },
    },
    {
        collection: "analytics",
    },
);

export interface Analytics {
    _id: Schema.Types.ObjectId;
    marketer?: User | Schema.Types.ObjectId;
    teacher?: User | Schema.Types.ObjectId;
    count: number;
    infoName: string;
    forGroup: string;
    type: string;
    date: Date;
    createdAt: Date;
}
