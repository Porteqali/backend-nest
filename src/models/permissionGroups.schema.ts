import { Document, Schema } from "mongoose";
import { Permission } from "./permissions.schema";

export type RoleDocument = Role & Document;

export const RoleSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    permissions: [
        {
            type: String,
        },
    ],
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

export interface Role {
    _id: Schema.Types.ObjectId;
    name: string;
    permissions?: Permission[] | String[];
    createdAt: Date;
}
