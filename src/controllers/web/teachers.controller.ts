import { readFile } from "fs/promises";
import { Controller, Get, InternalServerErrorException, Post, Req, Res, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { CourseDocument } from "src/models/courses.schema";

@Controller("teachers")
export class TeachersController {
    constructor(@InjectModel("User") private readonly UserModel: Model<UserDocument>, @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>) {}

    @Get("/")
    async getAllTeachers(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const teachers = await this.UserModel.find({ role: "teacher", status: "active" })
            .select("image title name family groups description socials")
            .populate("groups", "icon name topGroup")
            .exec();

        let groupedTeachers = {};
        teachers.forEach((teacher) => {
            teacher.groups.forEach((group) => {
                if (typeof groupedTeachers[group.topGroup] === "undefined") groupedTeachers[group.topGroup] = [];
                groupedTeachers[group.topGroup].push(teacher);
            });
        });

        return res.json(groupedTeachers);
    }

    @Get("/:id/info")
    async getTeacherInfo(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        
        if (!req.params.id) throw new UnprocessableEntityException();
        const id: any = req.params.id.toString() || "";

        const teacher = await this.UserModel.findOne({ _id: id, role: "teacher", status: "active" })
            .select("image title name family groups description socials")
            .exec();

        // TODO : count the total users that bouth this teacher courses

        const courseCount = await this.CourseModel.countDocuments({ teacher: id, status: "active" }).exec();

        return res.json({ teacher, courseCount });
    }

    @Get("/:id/courses")
    async getTeacherCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!req.params.id) throw new UnprocessableEntityException();
        const id: any = req.params.id.toString() || "";

        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 10;

        const search = req.query.search ? req.query.search.toString() : "";
        const order = req.query.order ? req.query.order.toString() : "";
        const group = req.query.group ? req.query.group.toString() : "";

        // the base query object
        let query = {
            status: "active",
            teacher: new Types.ObjectId(id),
        };
        if (!!group) {
            query["groups.topGroup"] = group;
        }

        // sort
        let sort = {};
        switch (order) {
            case "most-popular":
                sort["buyCount"] = "desc";
                break;
            case "oldest":
                sort["publishedAt"] = "asc";
                break;
            default:
                sort["publishedAt"] = "desc";
        }

        // making the model with query
        let data = this.CourseModel.aggregate();
        data.lookup({
            from: "coursegroups",
            localField: "groups",
            foreignField: "_id",
            as: "groups",
        });
        data.match(query);
        data.match({
            $or: [
                { name: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { description: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "groups.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { tags: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "topics.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });
        data.sort(sort);
        data.project("image name description price groups buyCount score topics.time");

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

        // transform data
        results[0].data.map((row) => {
            // TODO : course category
            let seconds = 0;
            row.topics.forEach((topic) => {
                seconds += parseInt(topic.time.hours) * 3600 + parseInt(topic.time.minutes) * 60 + parseInt(topic.time.seconds);
            });
            delete row.topics;
            row.totalTime = new Date(seconds * 1000).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0];
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
