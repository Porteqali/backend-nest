import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { AuthService } from "src/services/auth.service";
import { UserCourseDocument } from "src/models/userCourses.schema";

@Controller("marketer-panel/commissions")
export class CommissionsController {
    constructor(private readonly authService: AuthService, @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>) {}

    @Get("/")
    async getMarketerCommissionList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "marketer", [], "AND"))) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "asc";
        switch (req.query.sort) {
            case "مشتری":
                sort = { "user.name": sortType, "user.family": sortType };
                break;
            case "دوره":
                sort = { "course.name": sortType };
                break;
            case "مبلغ پرداختی کاربر":
                sort = { paidAmount: sortType };
                break;
            case "کمیسیون بازاریاب":
                sort = { marketerCut: sortType };
                break;
            default:
                sort = { createdAt: sortType };
                break;
        }

        // the base query object
        let query = {
            marketer: new Types.ObjectId(req.user.user._id),
        };

        // filters
        // ...

        // making the model with query
        let data = this.UserCourseModel.aggregate();
        data.match(query);
        data.lookup({
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
        });
        data.lookup({
            from: "courses",
            localField: "course",
            foreignField: "_id",
            as: "course",
        });
        data.sort(sort);
        data.project("user.image user.name user.family course.name marketerCut paidAmount createdAt");
        if (!!search) {
            data.match({
                $or: [
                    { "user.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { "user.family": { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { "course.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { paidAmount: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { marketerCut: { $regex: new RegExp(`.*${search}.*`, "i") } },
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

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }
}
