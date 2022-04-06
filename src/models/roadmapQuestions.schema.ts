import { Document, Schema } from "mongoose";
import { Major } from "./majors.schema";
import { RoadmapQuestionCategory } from "./roadmapQuestionCategories.schema";
import { User } from "./users.schema";

export type RoadmapQuestionDocument = RoadmapQuestion & Document;

export const RoadmapQuestionSchema = new Schema({
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    question: {
        type: String,
    },
    answers: [
        new Schema({
            optionNumber: { type: Number },
            text: { type: String },
            majorPoints: [
                {
                    major: { type: Schema.Types.ObjectId, ref: "Major" },
                    point: { type: Number },
                },
            ],
        }),
    ],
    category: {
        type: Schema.Types.ObjectId,
        ref: "RoadmapQuestionCategory",
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface RoadmapQuestion {
    _id: Schema.Types.ObjectId;
    author: User | Schema.Types.ObjectId;
    question: string;
    answers: Answer[];
    category: RoadmapQuestionCategory | Schema.Types.ObjectId;
    createdAt: Date;
}

export interface Answer {
    _id: Schema.Types.ObjectId;
    optionNumber: number;
    text: string;
    majorPoints: majorPoint[];
}

export interface majorPoint {
    major: Major | Schema.Types.ObjectId;
    point: number;
}
