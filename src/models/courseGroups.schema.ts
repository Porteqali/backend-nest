import { Document, Schema } from "mongoose";

export type CourseGroupDocument = CourseGroup & Document;

export const CourseGroupSchema = new Schema({
    icon: {
        type: String,
    },
    name: {
        type: String,
        required: true,
    },
    topGroup: {
        type: String,
        enum: ["network", "languages", "graphic", "university", "programming", "web-design", "business", "free"],
    },
    status: {
        type: String,
        enum: ["active", "deactive"],
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface CourseGroup {
    _id: Schema.Types.ObjectId;
    icon?: string;
    name: string;
    topGroup: string;
    status: string;
    createdAt: Date;
}
