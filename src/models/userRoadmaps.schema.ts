import { Document, Schema } from "mongoose";
import { Course } from "./courses.schema";
import { User } from "./users.schema";

export type BundleDocument = Bundle & Document;

export const BundleSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User" },
    bundle: { type: Schema.Types.ObjectId, ref: "Bundle" },
    currentCourse: { type: Schema.Types.ObjectId, ref: "Course" },
    status: {
        type: String,
        enum: ["active", "finished", "canceled"],
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Bundle {
    _id: Schema.Types.ObjectId;
    user: User | Schema.Types.ObjectId;
    bundle: Bundle | Schema.Types.ObjectId;
    currentCourse: Course | Schema.Types.ObjectId;
    status: string;
    createdAt: Date;
}
