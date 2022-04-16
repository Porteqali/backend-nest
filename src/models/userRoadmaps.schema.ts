import { Document, Schema } from "mongoose";
import { Bundle } from "./bundles.schema";
import { Course } from "./courses.schema";
import { Discount } from "./discount.schema";
import { User } from "./users.schema";

export type UserRoadmapDocument = UserRoadmap & Document;

export const UserRoadmapSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User" },
    bundle: { type: Schema.Types.ObjectId, ref: "Bundle" },

    finishedCourses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
    currentCourse: { type: Schema.Types.ObjectId, ref: "Course" },
    currentCourseStartDate: { type: Date },

    status: {
        type: String,
        enum: ["active", "finished", "canceled"],
    },
    startDate: { type: Date },
    finishDate: { type: Date },

    discount: { type: Schema.Types.ObjectId, ref: "Discount" },

    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface UserRoadmap {
    _id: Schema.Types.ObjectId;
    user: User | Schema.Types.ObjectId;
    bundle: Bundle | Schema.Types.ObjectId;

    finishedCourses: Array<Course | Schema.Types.ObjectId>;
    currentCourse: Course | Schema.Types.ObjectId;
    currentCourseStartDate?: Date;

    status: string;
    startDate: Date;
    finishDate: Date;

    discount?: Discount | Schema.Types.ObjectId;

    createdAt: Date;
}
