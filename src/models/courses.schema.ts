import { Document, Schema } from "mongoose";
import { Commission } from "./commissions.schema";
import { CourseGroup } from "./courseGroups.schema";
import { User } from "./users.schema";

export type CourseDocument = Course & Document;

export const CourseSchema = new Schema({
    image: { type: String },
    name: { type: String, required: true },
    teacher: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    description: { type: String },
    price: { type: Number, min: 0, required: true },
    exerciseFiles: [{ type: String }],
    groups: [{ type: Schema.Types.ObjectId, ref: "CourseGroup" }],
    tags: [{ type: String }],
    status: {
        type: String,
        enum: ["active", "deactive"],
    },
    commission: { type: Schema.Types.ObjectId, ref: "Commission" },
    buyCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    showInNew: { type: Boolean, default: false },
    topics: new Schema({
        order: { type: Number },
        name: { type: String },
        time: {
            hours: { type: Number },
            minutes: { type: Number },
            seconds: { type: Number },
        },
        description: { type: String },
        file: { type: String },
        isFree: { type: Boolean, default: false },
        isFreeForUsers: { type: Boolean, default: false },
        status: { type: String, enum: ["active", "deactive"] },
    }),
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Course {
    _id: Schema.Types.ObjectId;
    image: string;
    name: string;
    teacher: User | Schema.Types.ObjectId;
    description: string;
    price: number;
    exerciseFiles: string[];
    groups: Array<CourseGroup | Schema.Types.ObjectId>;
    tags: string[];
    status: string;
    commission: Commission | Schema.Types.ObjectId;
    buyCount: number;
    viewCount: number;
    score: number;
    showInNew: boolean;
    topics: string;
    createdAt: Date;
}

export interface CourseTopic {
    _id: Schema.Types.ObjectId;
    order: number;
    name: string;
    time: Time;
    description: string;
    file: string;
    isFree: boolean;
    isFreeForUsers: boolean;
    status: string;
}

export interface Time {
    hours: number;
    minutes: number;
    seconds: number;
}