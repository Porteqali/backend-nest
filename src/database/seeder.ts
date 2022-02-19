import { Controller, Get, InternalServerErrorException, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { PermissionDocument } from "src/models/permissions.schema";
import { PermissionGroupDocument } from "src/models/permissionGroups.schema";
import { MetadataDocument } from "src/models/metadatas.schema";
import { records as permissionRecords } from "src/database/seeds/permissions.seed";
import { UserDocument } from "src/models/users.schema";
import { hash } from "bcrypt";

@Controller("seeder")
export class Seeder {
    constructor(
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Permission") private readonly PermissionModel: Model<PermissionDocument>,
        @InjectModel("PermissionGroup") private readonly PermissionGroupModel: Model<PermissionGroupDocument>,
        @InjectModel("Metadata") private readonly MetadataModel: Model<MetadataDocument>,
    ) {}

    @Get("/seed/all")
    async seedAll(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        // add any other seeds here in order
        // ->
        await this.seedPermissions(req, res, false);
        await this.seedPermissionGroups(req, res, false);
        await this.seedDefaultSuperAdmin(req, res, false);
        await this.seedDefaultMetadata(req, res, false);

        return res.json({ seedAll: 1 });
    }

    @Get("/seed/permissions")
    async seedPermissions(@Req() req: Request, @Res() res: Response, end = true): Promise<void | Response> {
        this.PermissionModel.collection.drop().catch((e) => {
            throw new InternalServerErrorException(e);
        });

        await this.PermissionModel.insertMany(permissionRecords).catch((e) => {
            throw new InternalServerErrorException(e);
        });

        if (end) return res.json({ seedPermissions: 1 });
    }

    @Get("/seed/permission-groups")
    async seedPermissionGroups(@Req() req: Request, @Res() res: Response, end = true): Promise<void | Response> {
        this.PermissionGroupModel.collection.drop().catch((e) => {
            throw new InternalServerErrorException(e);
        });

        const permissions = await this.PermissionModel.find().select(["_id"]).exec();
        await this.PermissionGroupModel.create({
            name: "SuperAdmin",
            permissions: permissions,
        }).catch((e) => {
            throw new InternalServerErrorException(e);
        });

        if (end) return res.json({ seedPermissionGroups: 1 });
    }

    @Get("/seed/super-admin")
    async seedDefaultSuperAdmin(@Req() req: Request, @Res() res: Response, end = true): Promise<void | Response> {
        this.UserModel.collection.drop().catch((e) => {
            throw new InternalServerErrorException(e);
        });

        const permissionGroup = await this.PermissionGroupModel.findOne({ name: "SuperAdmin" }).exec();

        await this.UserModel.create({
            name: "kasra",
            family: "keshvardoost",
            email: "kasrakeshvardoost@gmail.com",
            emailVerifiedAt: new Date(Date.now()),
            mobile: "09358269691",
            mobileVerifiedAt: new Date(Date.now()),
            password: await hash("12345678", 5),
            role: "admin",
            status: "active",
            permissionGroup: permissionGroup._id,
        }).catch((e) => {
            throw new InternalServerErrorException(e);
        });

        if (end) return res.json({ seedDefaultSuperAdmin: 1 });
    }

    @Get("/seed/metadata")
    async seedDefaultMetadata(@Req() req: Request, @Res() res: Response, end = true): Promise<void | Response> {
        this.MetadataModel.collection.drop().catch((e) => {
            throw new InternalServerErrorException(e);
        });

        await this.MetadataModel.create({
            page: "home",
            title: "گروه آموزشی پرتقال",
            description: "گروه آموزشی پرتقال",
            keywords: "پرتقال",
            canonical: "https://porteqali.com",
            themeColor: "#ff7952",
            site: "https://porteqali.com",
            language: "fa",
        }).catch((e) => {
            throw new InternalServerErrorException(e);
        });

        if (end) return res.json({ seedDefaultMetadata: 1 });
    }
}
