import { Controller, Get, InternalServerErrorException, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { PermissionDocument } from "src/models/permissions.schema";
import { PermissionGroupDocument } from "src/models/permissionGroups.schema";
import { MetadataDocument } from "src/models/metadatas.schema";
import { records as permissionRecords } from "src/database/seeds/permissions.seed";

@Controller("seeder")
export class Seeder {
    constructor(
        @InjectModel("Permission") private readonly PermissionModel: Model<PermissionDocument>,
        @InjectModel("PermissionGroup") private readonly PermissionGroupModel: Model<PermissionGroupDocument>,
        @InjectModel("Metadata") private readonly MetadataModel: Model<MetadataDocument>,
    ) {}

    @Get("/seed/all")
    async seedAll(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        // add any other seeds here in order
        // ->
        await this.seedPermissions(req, res);
        await this.seedPermissionGroups(req, res);
        await this.seedDefaultMetadata(req, res);

        return res.json({ seedAll: 1 });
    }

    @Get("/seed/permissions")
    async seedPermissions(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        this.PermissionModel.collection.drop().catch((e) => {
            throw new InternalServerErrorException(e);
        });

        await this.PermissionModel.insertMany(permissionRecords).catch((e) => {
            throw new InternalServerErrorException(e);
        });

        return res.json({ seedPermissions: 1 });
    }

    @Get("/seed/permission-groups")
    async seedPermissionGroups(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
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

        return res.json({ seedPermissionGroups: 1 });
    }

    @Get("/seed/metadata")
    async seedDefaultMetadata(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        this.MetadataModel.collection.drop().catch((e) => {
            throw new InternalServerErrorException(e);
        });

        await this.MetadataModel.create({
            page: "home",
            title: "گروه آموزشی پرتقال",
            description: "",
            keywords: "",
            canonical: "",
            themeColor: "#ff7952",
            site: "",
            language: "fa",
        }).catch((e) => {
            throw new InternalServerErrorException(e);
        });

        return res.json({ seedDefaultMetadata: 1 });
    }
}
