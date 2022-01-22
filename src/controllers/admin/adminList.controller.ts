import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { unlink, readFile } from "fs/promises";
import { hash } from "bcrypt";
import { UserDocument } from "src/models/users.schema";
import { PermissionGroupDocument } from "src/models/permissionGroups.schema";
import { AuthService } from "src/services/auth.service";
import { CreatePermissionGroupDto } from "src/dto/adminPanel/permissionGroups.dto";
import { FilesInterceptor } from "@nestjs/platform-express";
import { CreateNewAdminDto, UpdateNewAdminDto } from "src/dto/adminPanel/adminList.dto";
import { randStr } from "src/helpers/str.helper";
import * as sharp from "sharp";

@Controller("admin/list")
export class AdminListController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("PermissionGroup") private readonly PermissionGroupModel: Model<PermissionGroupDocument>,
    ) {}

    @Get("/")
    async getAdminsList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.list.view"])) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "asc";
        switch (req.query.sort) {
            case "کاربر":
                sort = { name: sortType, family: sortType };
                break;
            case "ایمیل":
                sort = { email: sortType };
                break;
            case "سطح دسترسی":
                sort = { "permissionGroup.name": sortType };
                break;
            case "وضعیت":
                sort = { status: sortType };
                break;
            default:
                sort = { createdAt: sortType };
                break;
        }

        // the base query object
        let query = {
            role: "admin",
        };

        // filters
        // ...

        // making the model with query
        let data = this.UserModel.aggregate();
        data.lookup({
            from: "permissiongroups",
            localField: "permissionGroup",
            foreignField: "_id",
            as: "permissionGroup",
        });
        data.match(query);
        data.match({
            $or: [
                { name: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { family: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { email: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "permissionGroup.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });
        data.sort(sort);
        data.project("_id image name family email status createdAt permissionGroup.name");

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
    async getAdmin(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.list.view"])) throw new ForbiddenException();

        const admin = await this.UserModel.findOne({ _id: req.params.id, role: "admin" }).exec();
        return res.json(admin);
    }

    @Post("/")
    @UseInterceptors(FilesInterceptor("files"))
    async addAdmin(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: CreateNewAdminDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.list.add"])) throw new ForbiddenException();

        const isEmailExists = await this.UserModel.exists({ email: input.email });
        if (isEmailExists) {
            throw new UnprocessableEntityException([{ property: "name", errors: ["ایمیل قبلا استفاده شده"] }]);
        }

        if (input.password !== input.passwordConfirmation) {
            throw new UnprocessableEntityException([{ property: "password", errors: ["رمزعبورها باهم همخوانی ندارند"] }]);
        }

        let imageLink = "";
        if (!!files.length) {
            const ogName = files[0].originalname;
            const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (files[0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["حجم فایل باید کمتر از 2Mb باشد"] }]);
            // check file format
            let isMimeOk = extension == "png" || extension == "gif" || extension == "jpeg" || extension == "jpg";
            if (!isMimeOk) throw new UnprocessableEntityException([{ property: "image", errors: ["فرمت فایل معتبر نیست"] }]);

            const randName = randStr(10);
            const img = sharp(Buffer.from(files[0].buffer));
            img.resize(256);
            const url = `storage/public/user_avatars/${randName}.${extension}`;
            await img.toFile(url).catch((e) => console.log(e));

            imageLink = url.replace("storage/", "/file/");
        }

        await this.UserModel.create({
            image: imageLink,
            name: input.name,
            family: input.family,
            email: input.email,
            permissionGroup: input.permissionGroup,
            password: await hash(input.password, 5),
            status: input.status,
            role: "admin",
        });

        return res.end();
    }

    @Put("/:id")
    @UseInterceptors(FilesInterceptor("files"))
    async editAdmin(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: UpdateNewAdminDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.list.edit"])) throw new ForbiddenException();

        const isEmailExists = await this.UserModel.exists({ _id: { $ne: req.params.id }, email: input.email });
        if (isEmailExists) {
            throw new UnprocessableEntityException([{ property: "name", errors: ["ایمیل قبلا استفاده شده"] }]);
        }

        if (!!input.password && !!input.passwordConfirmation && input.password !== input.passwordConfirmation) {
            throw new UnprocessableEntityException([{ property: "password", errors: ["رمزعبورها باهم همخوانی ندارند"] }]);
        }

        // find admin
        const admin = await this.UserModel.findOne({ _id: req.params.id }).exec();
        if (!admin) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);

        // find permission group
        const permissionGroup = await this.PermissionGroupModel.findOne({ _id: input.permissionGroup }).exec();
        if (!admin) throw new NotFoundException([{ property: "permissionGroup", errors: ["گروه دسترسی پیدا نشد"] }]);

        let imageLink = "";
        if (!!files.length) {
            const ogName = files[0].originalname;
            const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (files[0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["حجم فایل باید کمتر از 2Mb باشد"] }]);
            // check file format
            let isMimeOk = extension == "png" || extension == "gif" || extension == "jpeg" || extension == "jpg";
            if (!isMimeOk) throw new UnprocessableEntityException([{ property: "image", errors: ["فرمت فایل معتبر نیست"] }]);

            // delete the old image from system
            await unlink(admin.image.replace("/file/", "storage/")).catch((e) => {});

            const randName = randStr(10);
            const img = sharp(Buffer.from(files[0].buffer));
            img.resize(256);
            const url = `storage/public/user_avatars/${randName}.${extension}`;
            await img.toFile(url).catch((e) => console.log(e));

            imageLink = url.replace("storage/", "/file/");
        } else if (!!input.image && input.image != "") {
            imageLink = admin.image;
        }

        let password = admin.password;
        if (!!input.password && input.password != "") {
            password = await hash(input.password, 5);
        }

        await this.UserModel.updateOne(
            { _id: req.params.id },
            {
                image: imageLink,
                name: input.name,
                family: input.family,
                email: input.email,
                permissionGroup: permissionGroup._id,
                password: password,
                status: input.status,
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deleteAdmin(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.list.delete"])) throw new ForbiddenException();

        const data = await this.UserModel.findOne({ _id: req.params.id, role: "admin" }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete the admin
        await this.UserModel.deleteOne({ _id: req.params.id, role: "admin" }).exec();

        return res.end();
    }
}
