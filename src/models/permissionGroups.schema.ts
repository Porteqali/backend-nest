import { Document, Schema } from "mongoose";
import { Permission } from "./permissions.schema";

export type PermissionGroupDocument = PermissionGroup & Document;

export const PermissionGroupSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    permissions: [{ type: String }],
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface PermissionGroup {
    _id: Schema.Types.ObjectId;
    name: string;
    permissions?: Permission[] | String[];
    createdAt: Date;
}
