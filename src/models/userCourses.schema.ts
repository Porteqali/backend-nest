import { Document, Schema } from "mongoose";
import { Course } from "./courses.schema";
import { User } from "./users.schema";

export type UserCourseDocument = UserCourse & Document;

export const UserCourseSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    course: {
        type: Schema.Types.ObjectId,
        ref: "Course",
    },
    teacherCut: { type: Number, required: true },
    coursePrice: { type: Number, required: true },
    dicount: {
        amount: { type: Number },
        amountType: { type: String, enum: ["percent", "number"] },
    },
    payablePrice: { type: Number, required: true },
    transactionCode: { type: String },
    authority: { type: String, required: true },
    status: {
        type: String,
        enum: ["waiting_for_payment", "ok", "cancel", "error"],
        default: "waiting_for_payment",
    },
    error: { type: String },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface UserCourse {
    _id: Schema.Types.ObjectId;
    user: User | Schema.Types.ObjectId;
    course: Course | Schema.Types.ObjectId;
    teacherCut: number;
    coursePrice: number;
    dicount: Discount;
    payablePrice: number;
    transactionCode: string;
    authority: string;
    status: string;
    error?: string;
    createdAt: Date;
}

export interface Discount {
    amount: number;
    amountType: string;
}
