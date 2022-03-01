import { Document, Schema } from "mongoose";
import { Course } from "./courses.schema";

export type CourseAnalyticDocument = CourseAnalytic & Document;

export const CourseAnalyticSchema = new Schema({
    course: {
        type: Schema.Types.ObjectId,
        ref: "Course",
        required: true,
    },
    courseName: { type: String },
    buyCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    type: {
        type: String,
        enum: ["today", "yesterday", "current-month", "last-month"],
    },
    updatedAt: { type: Date },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface CourseAnalytic {
    _id: Schema.Types.ObjectId;
    course: Course | Schema.Types.ObjectId;
    courseName: string;
    buyCount: number;
    viewCount: number;
    type: string;
    updatedAt: Date;
    createdAt: Date;
}
