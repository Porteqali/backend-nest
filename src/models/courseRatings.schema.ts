import { Document, Schema } from "mongoose";
import { Course } from "./courses.schema";
import { User } from "./users.schema";

export type CourseRatingDocument = CourseRating & Document;

export const CourseRatingSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    course: {
        type: Schema.Types.ObjectId,
        ref: "Course",
        required: true,
    },
    rating: {
        type: Number,
        required: true,
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface CourseRating {
    _id: Schema.Types.ObjectId;
    user: User | Schema.Types.ObjectId;
    course: Course | Schema.Types.ObjectId;
    rating: number;
    createdAt: Date;
}
