import { Document, Schema } from "mongoose";
import { Role } from "./permissionGroups.schema";

export type UserDocument = User & Document;

export const UserSchema = new Schema({
    image: {
        type: String,
    },
    name: {
        type: String,
        required: true,
    },
    family: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    emailVerifiedAt: {
        type: Date,
    },
    password: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
        enum: ["active", "deactive"],
    },
    googleId: {
        type: String,
    },
    role: {
        type: Schema.Types.ObjectId,
        ref: "Role",
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface User {
    _id: Schema.Types.ObjectId;
    image: string;
    name: string;
    family: string;
    email: string;
    emailVerifiedAt: Date;
    password: string;
    status: string;
    googleId: string;
    role: Role | Schema.Types.ObjectId;
    createdAt: Date;
}
