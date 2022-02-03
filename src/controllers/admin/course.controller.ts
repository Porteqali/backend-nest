import { Body, Controller, Delete, Get, Post, Put, Query, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { unlink, writeFile } from "fs/promises";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { UserCourseDocument } from "src/models/userCourses.schema";
import { CourseDocument } from "src/models/courses.schema";
import * as Jmoment from "jalali-moment";

@Controller("admin/courses")
export class CourseController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
    ) {}

    @Get("/topics/:id")
    async getCourseTopics(@Req() req: Request, @Res() res: Response): Promise<void | Response> {}

    @Put("/topics/:id")
    async editCourseTopics(@Req() req: Request, @Res() res: Response): Promise<void | Response> {}

    // =============================================================================

    @Get("/")
    async getCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.courses.view"])) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "asc";
        switch (req.query.sort) {
            case "عنوان":
                sort = { title: sortType };
                break;
            case "استاد":
                sort = { "teacher.name": sortType, "teacher.family": sortType };
                break;
            case "مبلغ":
                sort = { price: sortType };
                break;
            case "گروه دوره":
                sort = { "groups.name": sortType };
                break;
            case "میزان خرید":
                sort = { buyCount: sortType };
                break;
            case "میزان بازدید":
                sort = { viewCount: sortType };
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
        let data = this.CourseModel.aggregate();
        data.lookup({
            from: "users",
            localField: "teacher",
            foreignField: "_id",
            as: "teacher",
        });
        data.lookup({
            from: "coursegroups",
            localField: "groups",
            foreignField: "_id",
            as: "groups",
        });
        data.match(query);
        data.sort(sort);
        data.project("image name description teacher.image teacher.name teacher.family groups.name price buyCount viewCount status createdAt");
        data.match({
            $or: [
                { name: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { description: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { price: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "teacher.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "teacher.family": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "groups.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { status: { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });

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

        // transform data
        results[0].data.map((row) => {
            row.tillCreatedAt = Jmoment(row.createdAt).locale("fa").fromNow();
            return row;
        });

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }

    @Get("/:id")
    async getCourse(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.courses.view"])) throw new ForbiddenException();

        const course = await this.CourseModel.findOne({ _id: req.params.id })
            .populate("teacher", "image name family")
            .populate("groups", "icon name")
            .populate("commission", "name")
            .exec();
        if (!course) throw new NotFoundException();
        return res.json(course);
    }

    @Post("/:id")
    async addCourse(@Req() req: Request, @Res() res: Response): Promise<void | Response> {}

    @Put("/:id")
    async editCourse(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        // TODO
        // also check for diffrence between new and old exerciseFiles list and delete the ones that removed and upload new ones
    }

    @Delete("/:id")
    async deleteCourse(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.courses.delete"])) throw new ForbiddenException();

        const data = await this.CourseModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // TODO
        // also delete local video files and images

        // delete the course
        await this.CourseModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
