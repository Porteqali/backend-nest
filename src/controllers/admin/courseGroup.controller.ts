import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { unlink, readFile } from "fs/promises";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { FilesInterceptor } from "@nestjs/platform-express";
import { randStr } from "src/helpers/str.helper";
import * as sharp from "sharp";
import { CourseGroupDocument } from "src/models/courseGroups.schema";
import { CreateNewCourseGroupDto, UpdateCourseGroupDto } from "src/dto/adminPanel/courseGroups.dto";

@Controller("admin/course-groups")
export class CourseGroupsController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("CourseGroup") private readonly CourseGroupModel: Model<CourseGroupDocument>,
    ) {}

    @Get("/")
    async getCourseGroupList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.course-groups.view"])) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "desc";
        switch (req.query.sort) {
            case "نام گروه":
                sort = { name: sortType };
                break;
            case "گروه اصلی":
                sort = { topGroup: sortType };
                break;
            case "وضعیت":
                sort = { status: sortType };
                break;
            default:
                sort = { createdAt: sortType };
                break;
        }

        // the base query object
        let query = {};

        // filters
        // ...

        // making the model with query
        let data = this.CourseGroupModel.aggregate();
        data.match(query);
        data.match({
            $or: [{ name: { $regex: new RegExp(`.*${search}.*`, "i") } }, { topGroup: { $regex: new RegExp(`.*${search}.*`, "i") } }],
        });
        data.sort(sort);
        data.project("icon name topGroup status createdAt");

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
    async getCourseGroup(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.course-groups.view"])) throw new ForbiddenException();

        const courseGroup = await this.CourseGroupModel.findOne({ _id: req.params.id }).exec();
        if (!courseGroup) throw new NotFoundException();
        return res.json(courseGroup);
    }

    @Post("/")
    @UseInterceptors(FilesInterceptor("files"))
    async addCourseGroup(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: CreateNewCourseGroupDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.course-groups.add"])) throw new ForbiddenException();

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
            const url = `storage/public/course_group_icons/${randName}.${extension}`;
            await img.toFile(url).catch((e) => console.log(e));

            imageLink = url.replace("storage/", "/file/");
        }

        await this.CourseGroupModel.create({
            icon: imageLink,
            name: input.name,
            topGroup: input.topGroup,
            status: input.status,
        });

        return res.end();
    }

    @Put("/:id")
    @UseInterceptors(FilesInterceptor("files"))
    async editCourseGroup(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: UpdateCourseGroupDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.course-groups.edit"])) throw new ForbiddenException();

        // find courseGroup
        const courseGroup = await this.CourseGroupModel.findOne({ _id: req.params.id }).exec();
        if (!courseGroup) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);

        let imageLink = "";
        if (!!files.length) {
            const ogName = files[0].originalname;
            const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (files[0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["حجم فایل باید کمتر از 2Mb باشد"] }]);
            // check file format
            let isMimeOk = extension == "png" || extension == "gif" || extension == "jpeg" || extension == "jpg";
            if (!isMimeOk) throw new UnprocessableEntityException([{ property: "image", errors: ["فرمت فایل معتبر نیست"] }]);

            // delete the old icon from system
            await unlink(courseGroup.icon.replace("/file/", "storage/")).catch((e) => {});

            const randName = randStr(10);
            const img = sharp(Buffer.from(files[0].buffer));
            img.resize(256);
            const url = `storage/public/course_group_icons/${randName}.${extension}`;
            await img.toFile(url).catch((e) => console.log(e));

            imageLink = url.replace("storage/", "/file/");
        } else if (!!input.image && input.image != "") {
            imageLink = courseGroup.icon;
        }

        await this.CourseGroupModel.updateOne(
            { _id: req.params.id },
            {
                icon: imageLink,
                name: input.name,
                topGroup: input.topGroup,
                status: input.status,
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deleteCourseGroup(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.course-groups.delete"])) throw new ForbiddenException();

        const data = await this.CourseGroupModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete the thing
        await this.CourseGroupModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
