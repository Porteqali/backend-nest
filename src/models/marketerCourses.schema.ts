import { Document, Schema } from "mongoose";
import { Course } from "./courses.schema";
import { User } from "./users.schema";

export type MarketerCoursesDocument = MarketerCourses & Document;

export const MarketerCoursesSchema = new Schema({
    marketer: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    course: {
        type: Schema.Types.ObjectId,
        ref: "Course",
    },
    commissionAmount: {
        type: Number,
        required: true,
    },
    commissionType: {
        type: String,
        enum: ["percent", "number"],
        required: true,
    },
    code: { type: String },
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

export interface MarketerCourses {
    _id: Schema.Types.ObjectId;
    marketer: User | Schema.Types.ObjectId;
    course: Course | Schema.Types.ObjectId;
    commissionAmount: number;
    commissionType: string;
    code?: string;
    status: string;
    createdAt: Date;
}
