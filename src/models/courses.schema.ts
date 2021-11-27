import { Document, Schema } from "mongoose";
import { User } from "./users.schema";

export type CourseDocument = Course & Document;

export const CourseSchema = new Schema({
    // TODO
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Course {
    _id: Schema.Types.ObjectId;
    // TODO
    createdAt: Date;
}
