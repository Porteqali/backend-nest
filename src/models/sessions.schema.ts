import { Document, Schema } from "mongoose";

export type SessionDocument = Session & Document;

export const SessionSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    userAgent: {
        type: String,
        required: true,
    },
    ip: {
        type: String,
        required: true,
    },
    expireAt: {
        type: Date,
        required: true,
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
    updatedAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Session {
    _id: Schema.Types.ObjectId;
    user: Schema.Types.ObjectId;
    userAgent: string;
    ip: string;
    expireAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
