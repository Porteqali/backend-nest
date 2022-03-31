import { Document, Schema } from "mongoose";
import { Course } from "./courses.schema";

export type BundleDocument = Bundle & Document;

export const BundleSchema = new Schema({
    title: { type: String, required: true },

    giftCodePercent: { type: Number },
    giftCodeDeadline: { type: Date },

    discountPercent: { type: Number },
    courses: [
        new Schema({
            order: { type: Number },
            course: { type: Schema.Types.ObjectId, ref: "Course" },
            minimumTimeNeeded: { type: Number, required: true }, // in days
        }),
    ],
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Bundle {
    _id: Schema.Types.ObjectId;
    title: string;
    giftCodePercent: number;
    giftCodeDeadline: Date;
    discountPercent: number;
    courses: BundleCourse[];
    createdAt: Date;
}

export interface BundleCourse {
    _id?: Schema.Types.ObjectId;
    order: number;
    course: Course | Schema.Types.ObjectId;
    minimumTimeNeeded: number;
}
