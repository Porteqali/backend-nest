import { Document, Schema } from "mongoose";
import { Commission } from "./commissions.schema";
import { CourseGroup } from "./courseGroups.schema";
import { User } from "./users.schema";

export type CourseDocument = Course & Document;

export const CourseSchema = new Schema({
    oid: { type: Number },
    image: { type: String },
    name: { type: String, required: true },
    teacher: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    description: { type: String },
    price: { type: Number, min: 0, required: true },
    exerciseFiles: [{ name: { type: String }, file: { type: String }, size: { type: String } }],
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
    topics: [
        new Schema({
            order: { type: Number },
            name: { type: String },
            time: {
                hours: { type: String },
                minutes: { type: String },
                seconds: { type: String },
            },
            description: { type: String },
            file: { type: String },
            isFree: { type: Boolean, default: false },
            isFreeForUsers: { type: Boolean, default: false },
            canPlay: { type: Boolean, default: false },
            size: { type: String },
            status: { type: String, enum: ["active", "deactive"], default: "active" },
            type: { type: String, enum: ["link", "file"], default: "file" },
        }),
    ],
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Course {
    _id: Schema.Types.ObjectId;
    oid?: number;
    image: string;
    name: string;
    teacher: User | Schema.Types.ObjectId;
    description: string;
    price: number;
    exerciseFiles: string[];
    groups: Array<CourseGroup | Schema.Types.ObjectId>;
    tags: string[];
    status: string;
    commission?: Commission | Schema.Types.ObjectId;
    buyCount: number;
    viewCount: number;
    score: number;
    showInNew: boolean;
    topics: Array<CourseTopic>;
    createdAt: Date;
}

export interface CourseTopic {
    _id?: Schema.Types.ObjectId;
    order: number;
    name: string;
    time: Time;
    description: string;
    file: string;
    isFree: boolean;
    isFreeForUsers: boolean;
    canPlay?: boolean;
    size?: string;
    status: string;
    type: string;
}

export interface Time {
    hours: string;
    minutes: string;
    seconds: string;
}
