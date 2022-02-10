import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as Jmoment from "jalali-moment";
import { AuthService } from "src/services/auth.service";
import { CourseDocument } from "src/models/courses.schema";

@Controller("teacher-panel/courses")
export class CoursesController {
    constructor(private readonly authService: AuthService, @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>) {}

    @Get("/")
    async getTeacherCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "teacher", [], "AND"))) throw new ForbiddenException();

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
        let query = {
            teacher: new Types.ObjectId(req.user.user._id),
        };

        // making the model with query
        let data = this.CourseModel.aggregate();
        data.lookup({
            from: "coursegroups",
            localField: "groups",
            foreignField: "_id",
            as: "groups",
        });
        data.match(query);
        data.sort(sort);
        data.project("image name description groups.name price buyCount viewCount status createdAt");
        if (!!search) {
            data.match({
                $or: [
                    { name: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { description: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { price: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { "groups.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { status: { $regex: new RegExp(`.*${search}.*`, "i") } },
                ],
            });
        }

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
}
