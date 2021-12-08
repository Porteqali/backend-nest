import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CourseGroupDocument } from "src/models/courseGroups.schema";

@Controller("course-groups")
export class CourseGroupController {
    constructor(@InjectModel("CourseGroup") private readonly CourseGroupModel: Model<CourseGroupDocument>) {}

    @Get("/")
    async getAllCourseGroups(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 50;

        const search = req.query.search ? req.query.search.toString() : "";

        // the base query object
        let query = {};

        // making the model with query
        let data = this.CourseGroupModel.aggregate();
        data.match(query);
        data.match({
            $or: [
                { name: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { topGroup: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { status: { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });
        data.sort({ createdAt: "desc" });
        data.project("_id icon name topGroup");

        // paginating
        data = data.facet({
            data: [{ $skip: (page - 1) * pp }, { $limit: pp }],
            total: [{ $group: { _id: null, count: { $sum: 1 } } }],
        });

        // executing query and getting the results
        const results = await data.exec().catch((e) => {
            throw e;
        });
        const total = results[0].total[0] ? results[0].total[0].count : 0;

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }
}
