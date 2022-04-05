import { Body, Controller, Delete, Get, Post, Put, Req, Res } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { PermissionDocument } from "src/models/permissions.schema";
import { PermissionGroupDocument } from "src/models/permissionGroups.schema";
import { AuthService } from "src/services/auth.service";
import { ArticleDocument } from "src/models/articles.schema";
import { CreatePermissionGroupDto } from "src/dto/adminPanel/permissionGroups.dto";

@Controller("admin/permission-groups")
export class PermissionGroupController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Permission") private readonly PermissionModel: Model<PermissionDocument>,
        @InjectModel("PermissionGroup") private readonly PermissionGroupModel: Model<PermissionGroupDocument>,
    ) {}

    @Get("/permissions")
    async getPermissionList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.permissions.view"])) throw new ForbiddenException();

        const permissions = await this.PermissionModel.find().exec();
        return res.json({ records: permissions });
    }

    @Get("/")
    async getPermissionGroups(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.permissions.view"])) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = "";
        const sortType = req.query.sort_type ? req.query.sort_type : "desc";
        switch (req.query.sort) {
            case "نام":
                sort = "name";
                break;
            default:
                sort = "createdAt";
                break;
        }

        // the base query object
        let query = {};

        // filters
        // ...

        // making the model with query
        let data = this.PermissionGroupModel.aggregate();
        data.match(query);
        data.match({
            $or: [{ name: { $regex: new RegExp(`.*${search}.*`, "i") } }, { permissions: { $regex: new RegExp(`.*${search}.*`, "i") } }],
        });
        data.sort({ [sort]: sortType });
        data.project("_id name createdAt");

        // paginating
        data = data.facet({
            data: [{ $skip: (page - 1) * pp }, { $limit: pp }],
            total: [{ $group: { _id: null, count: { $sum: 1 } } }],
        });

        // executing query and getting the results
        let error = false;
        const results = await data.exec().catch((e) => (error = true));
        if (error) throw new InternalServerErrorException();
        const total = results[0].total[0] ? results[0].total[0].count : 0;

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }

    @Get("/:id")
    async getPermissionGroup(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.permissions.view"])) throw new ForbiddenException();

        const permissionGroup = await this.PermissionGroupModel.findOne({ _id: req.params.id }).exec();
        if (!permissionGroup) throw new NotFoundException();
        return res.json(permissionGroup);
    }

    @Post("/")
    async addPermissionGroup(@Body() input: CreatePermissionGroupDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.permissions.add"])) throw new ForbiddenException();

        const isNameExists = await this.PermissionGroupModel.exists({ name: input.name });
        if (isNameExists) {
            throw new UnprocessableEntityException([{ property: "name", errors: ["نام گروه دسترسی قبلا استفاده شده"] }]);
        }

        await this.PermissionGroupModel.create({
            name: input.name,
            permissions: input.selectedPermissions,
        });

        return res.end();
    }

    @Put("/:id")
    async editPermissionGroup(@Body() input: CreatePermissionGroupDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.permissions.edit"])) throw new ForbiddenException();

        const isNameExists = await this.PermissionGroupModel.exists({ _id: { $ne: req.params.id }, name: input.name });
        if (isNameExists) {
            throw new UnprocessableEntityException([{ property: "name", errors: ["نام گروه دسترسی قبلا استفاده شده"] }]);
        }

        await this.PermissionGroupModel.updateOne(
            { _id: req.params.id },
            {
                name: input.name,
                permissions: input.selectedPermissions,
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deletePermissionGroup(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.permissions.delete"])) throw new ForbiddenException();

        const data = await this.PermissionGroupModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete every permissionGroup from users
        await this.UserModel.updateMany({ permissionGroup: data._id }, { permissionGroup: null }).exec();

        // delete the permissionGroup
        await this.PermissionGroupModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
