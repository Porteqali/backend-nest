import { Document, Schema } from "mongoose";
import { Commission } from "./commissions.schema";
import { CourseGroup } from "./courseGroups.schema";
import { PermissionGroup } from "./permissionGroups.schema";
import { UsanceType } from "./usanceTypes.schema";

export type UserDocument = User & Document;

export const UserSchema = new Schema({
    image: { type: String },
    title: { type: String },
    name: { type: String },
    family: { type: String },

    email: { type: String },
    emailVerifiedAt: { type: Date },
    emailVerificationCode: { type: String },

    mobile: { type: String },
    mobileVerifiedAt: { type: Date },
    mobileVerificationCode: { type: String },

    verficationCodeSentAt: { type: Date },

    forgetPasswordCode: { type: String },
    forgetPasswordCodeSentAt: { type: Date },

    tel: { type: String },
    password: { type: String },
    role: {
        type: String,
        enum: ["admin", "teacher", "user", "marketer"],
        default: "user",
        required: true,
    },

    walletBalance: { type: Number, default: 0, required: true }, // in tomans
    commissionBalance: { type: Number, default: 0, required: true }, // in tomans

    permissions: [{ type: String }],
    permissionGroup: {
        type: Schema.Types.ObjectId,
        ref: "PermissionGroup",
    },

    status: {
        type: String,
        enum: ["active", "deactive"],
        default: "deactive",
        required: true,
    },
    googleId: { type: String },
    createdAt: { type: Date, default: new Date(Date.now()) },
    registeredWith: new Schema({
        marketer: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        period: { type: Number }, // in days
        endsAt: { type: Date, default: new Date(Date.now()) },
    }),

    // marketer info
    address: { type: String },
    postalCode: { type: Number },
    marketingCode: { type: String },
    period: { type: Number }, // in days

    // teacher info
    groups: [{ type: Schema.Types.ObjectId, ref: "CourseGroup" }],
    description: { type: String },
    nationalCode: { type: Number }, // کد ملی
    nationalNumber: { type: Number }, // شماره شناسنامه
    birthDate: { type: String },
    fatherName: { type: String },
    commission: {
        type: Schema.Types.ObjectId,
        ref: "Commission",
    },
    usanceType: {
        type: Schema.Types.ObjectId,
        ref: "UsanceType",
    },
    socials: new Schema({
        name: { type: String },
        link: { type: String },
    }),
    financial: {
        cardNumber: { type: String },
        cardOwnerName: { type: String },
        cardBankName: { type: String },
        shebaNumber: { type: String },
    },
});

export interface User {
    _id: Schema.Types.ObjectId;
    title?: string;
    image?: string;
    name: string;
    family: string;
    email: string;
    emailVerifiedAt?: Date;
    emailVerificationCode?: string;
    mobile?: string;
    mobileVerifiedAt?: Date;
    mobileVerificationCode?: string;
    verficationCodeSentAt?: Date;
    forgetPasswordCode?: string;
    forgetPasswordCodeSentAt?: Date;
    tel?: string;
    password: string;
    status: string;
    googleId?: string;
    role: string;
    walletBalance: number;
    commissionBalance: number;
    permissions: string[];
    permissionGroup?: PermissionGroup & Schema.Types.ObjectId;
    createdAt: Date;
    registeredWith?: RegisteredWith;

    // marketer info
    address?: string;
    postalCode?: number;
    marketingCode?: string;
    period?: number;

    // teacher info
    groups?: Array<CourseGroup & Schema.Types.ObjectId>;
    description?: string;
    nationalCode?: number;
    nationalNumber?: number;
    birthDate?: string;
    fatherName?: string;
    commission?: Commission | Schema.Types.ObjectId;
    usanceType?: UsanceType | Schema.Types.ObjectId;
    socials?: Social[];

    financial?: {
        cardNumber?: string;
        cardOwnerName?: string;
        cardBankName?: string;
        shebaNumber?: string;
    };
}

export interface RegisteredWith {
    marketer: User | Schema.Types.ObjectId;
    period: number;
    endsAt: Date;
}

export interface Social {
    name: string;
    link: string;
}
