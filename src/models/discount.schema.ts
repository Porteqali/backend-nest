import { Document, Schema } from "mongoose";

export type DiscountDocument = Discount & Document;

export const DiscountSchema = new Schema({
    name: { type: String, required: true },
    code: { type: String },
    amount: { type: Number },
    amountType: {
        type: String,
        enum: ["percent", "number"],
    },
    type: {
        type: String,
        enum: ["code", "onCourse"],
    },
    status: {
        type: String,
        enum: ["active", "deactive"],
    },
    startDate: { type: Date },
    endDate: { type: Date },
    emmitTo: {
        type: String,
        enum: ["allCourses", "course", "courseGroup", "teacherCourses", "singleUser"],
        default: "allCourses",
    },
    emmitToId: { type: Schema.Types.ObjectId },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Discount {
    _id: Schema.Types.ObjectId;
    name: string;
    code?: string;
    amount: number;
    amountType: string;
    type: string;
    status: string;
    startDate?: Date;
    endDate?: Date;
    emmitTo: string;
    emmitToId?: Schema.Types.ObjectId;
    createdAt: Date;
}
