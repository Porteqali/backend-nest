import { Document, Schema } from "mongoose";
import { Course } from "./courses.schema";

export type BundleDocument = Bundle & Document;

export const BundleSchema = new Schema({
    title: { type: String, required: true },
    desc: { type: String },

    giftCodePercent: { type: Number },
    giftCodeDeadline: { type: Number }, // in days

    discountPercent: { type: Number, default: 0 },
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
    desc?: string;
    giftCodePercent: number;
    giftCodeDeadline: number;
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
