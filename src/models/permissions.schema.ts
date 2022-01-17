import { Document, Schema } from "mongoose";

export type PermissionDocument = Permission & Document;

export const PermissionSchema = new Schema({
    _id: {
        type: String,
    },
    label: {
        type: String,
        required: true,
    },
    group: {
        type: String,
        required: true,
    },
    groupLabel: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Permission {
    _id: string;
    label: string;
    group: string;
    groupLabel: string;
    createdAt: Date;
}
