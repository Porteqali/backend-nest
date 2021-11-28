import { Document, Schema } from "mongoose";
import { Commission } from "./commissions.schema";
import { PermissionGroup } from "./permissionGroups.schema";
import { Permission } from "./permissions.schema";
import { UsanceType } from "./usanceTypes.schema";

export type UserDocument = User & Document;

export const UserSchema = new Schema({
    image: { type: String },
    name: { type: String, required: true },
    family: { type: String, required: true },
    email: { type: String, required: true },
    emailVerifiedAt: { type: Date },
    mobile: { type: String },
    mobileVerifiedAt: { type: Date },
    mobileVerificationCode: { type: Date },
    tel: { type: String },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ["admin", "teacher", "user", "marketer"],
        required: true,
    },
    walletBalance: {
        type: Number,
        default: 0,
        required: true,
    },
    commissionBalance: {
        type: Number,
        default: 0,
        required: true,
    },
    permissions: [{ type: String }],
    permissionGroups: {
        type: Schema.Types.ObjectId,
        ref: "PermissionGroup",
    },
    status: {
        type: String,
        required: true,
        enum: ["active", "deactive"],
        default: "deactive",
    },
    googleId: { type: String },
    createdAt: { type: Date, default: new Date(Date.now()) },
    registeredWith: new Schema({
        marketer: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        period: { type: Number }, // in days
    }),

    address: { type: String },
    postalCode: { type: Number },
    marketingCode: { type: String },
    period: { type: Number }, // in days

    description: { type: String },
    nationalCode: { type: Number },
    nationalNumber: { type: Number },
    birthDate: { type: Date },
    fatherName: { type: String },
    commission: {
        type: Schema.Types.ObjectId,
        ref: "Commission",
    },
    usanceType: {
        type: Schema.Types.ObjectId,
        ref: "UsanceType",
    },
});

export interface User {
    _id: Schema.Types.ObjectId;
    image?: string;
    name: string;
    family: string;
    email: string;
    emailVerifiedAt?: Date;
    mobile?: string;
    mobileVerifiedAt?: string;
    mobileVerificationCode?: string;
    tel?: string;
    password: string;
    status: string;
    googleId?: string;
    role: string;
    walletBalance: number;
    permissions: Permission | Schema.Types.ObjectId;
    permissionGroups?: PermissionGroup | Schema.Types.ObjectId;
    createdAt: Date;
    registeredWith?: registeredWith;

    // marketer info
    address?: string;
    postalCode?: number;
    marketingCode?: string;
    period?: number;

    // teacher info
    description?: string;
    nationalCode?: number;
    nationalNumber?: number;
    birthDate?: Date;
    fatherName?: string;
    commission?: Commission | Schema.Types.ObjectId;
    usanceType?: UsanceType | Schema.Types.ObjectId;
}

export interface registeredWith {
    marketer: User | Schema.Types.ObjectId;
    period: number;
}
