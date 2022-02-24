import { Document, Schema } from "mongoose";
import { Course } from "./courses.schema";
import { User } from "./users.schema";

export type UserCourseDocument = UserCourse & Document;

export const UserCourseSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    userFullname: { type: String, required: true },

    course: {
        type: Schema.Types.ObjectId,
        ref: "Course",
        required: true,
    },
    courseName: { type: String, required: true },

    marketer: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },

    teacherCut: { type: Number, default: 0, required: true },
    marketerCut: { type: Number, default: 0 },

    coursePrice: { type: Number, required: true },
    coursePayablePrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
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
});

export interface UserCourse {
    _id: Schema.Types.ObjectId;
    user: User | Schema.Types.ObjectId;
    userFullname: string,

    course: Course | Schema.Types.ObjectId | any;
    courseName: string,
    
    marketer?: User | Schema.Types.ObjectId;

    teacherCut: number;
    marketerCut?: number;

    coursePrice: number;
    coursePayablePrice: number;
    totalPrice: number;
    paidAmount: number;

    transactionCode?: string;
    authority: string;
    paymentMethod: string;
    status: string;
    error?: string;
    ip?: string;
    createdAt: Date;
}
