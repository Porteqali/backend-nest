import { Document, Schema } from "mongoose";
import { User } from "./users.schema";

export type RoadmapQuestionCategoryDocument = RoadmapQuestionCategory & Document;

export const RoadmapQuestionCategorySchema = new Schema({
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    name: {
        type: String,
        unique: true,
    },
    desc: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface RoadmapQuestionCategory {
    _id: Schema.Types.ObjectId;
    author: User | Schema.Types.ObjectId;
    name: string;
    desc: string;
    createdAt: Date;
}
