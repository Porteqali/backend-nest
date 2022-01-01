import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CourseDocument } from "src/models/courses.schema";
import { UserDocument } from "src/models/users.schema";
import { duration } from "jalali-moment";
import { loadUser } from "src/helpers/auth.helper";
import { UserCourseDocument } from "src/models/userCourses.schema";
import { CourseRatingDocument } from "src/models/courseRatings.schema";

@Controller()
export class CoursesController {
    constructor(
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
        @InjectModel("CourseRating") private readonly CourseRatingModel: Model<CourseRatingDocument>,
    ) {}

    @Get("/most-viewed-courses")
    async getMostViewdCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const courses = await this.CourseModel.find({ status: "active" })
            .select("-oid -exerciseFiles -tags -status -commission -buyCount -topics.order -topics.file -topics.isFree -topics.isFreeForUsers")
            .populate("teacher", "image name family")
            .populate("groups", "-_id icon name topGroup")
            .sort({ viewCount: "desc" })
            .limit(10)
            .exec();
        return res.json(courses);
    }

    @Get("/top-teachers")
    async getTopTeachers(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const teachersQuery = this.UserModel.aggregate();
        teachersQuery.lookup({
            from: "courses",
            let: { teacher_id: "$_id" },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [{ $eq: ["$teacher", "$$teacher_id"] }, { $eq: ["$status", "active"] }],
                        },
                    },
                },
                {
                    $lookup: {
                        from: "coursegroups",
                        localField: "groups",
                        foreignField: "_id",
                        as: "groups",
                    },
                },
                { $limit: 3 },
            ],
            as: "courses",
        });
        teachersQuery.limit(2);
        teachersQuery.project(
            "image title name family description socials courses._id courses.name courses.description courses.groups.icon courses.groups.name courses.topics",
        );
        const teachers = await teachersQuery.exec().catch((e) => {
            throw e;
        });

        for (let i = 0; i < teachers.length; i++) {
            teachers[i].courseCount = await this.CourseModel.countDocuments({ status: "active", teacher: teachers[i]._id }).exec();
            teachers[i].courses = teachers[i].courses.map((course) => {
                let seconds = 0;
                course.topics.forEach((topic) => {
                    seconds += parseInt(topic.time.hours) * 3600 + parseInt(topic.time.minutes) * 60 + parseInt(topic.time.seconds);
                });
                course.totalTime = duration(seconds * 1000)
                    .locale("fa")
                    .humanize();
                return course;
            });
        }

        return res.json(teachers);
    }

    @Get("/courses")
    async getCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 10;

        const search = req.query.search ? req.query.search.toString() : "";
        const order = req.query.order ? req.query.order.toString() : "";
        const group = req.query.group ? req.query.group.toString() : "";

        // the base query object
        let query = {
            status: "active",
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
        data.lookup({
            from: "users",
            localField: "teacher",
            foreignField: "_id",
            as: "teacher",
        });
        data.match(query);
        data.match({
            $or: [
                { name: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { description: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "teacher.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "teacher.family": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "groups.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { tags: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "topics.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });
        data.sort(sort);
        data.project("teacher._id teacher.image teacher.name teacher.family image name description price groups buyCount score topics.time");

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

    @Get("/suggested-courses")
    async getSuggestedCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const courses = await this.CourseModel.find({ status: "active" })
            .select("name groups topics")
            .populate("groups", "icon name topGroup")
            .sort({ createdAt: "desc" })
            .limit(7)
            .exec();

        return res.json(courses);
    }

    @Get("/course/:id")
    async getCourse(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const course = await this.CourseModel.findOne({ _id: req.params.id, status: "active" })
            .select("-oid -status -commission")
            .populate("teacher", "image name family description")
            .populate("groups", "-_id icon name topGroup")
            .exec();
        if (!course) return res.status(404).end();

        // TODO : categoryTag = discount percentage | free | new | nothing

        // check if user bougth the course
        const loadedUser = await loadUser(req);
        let purchased = false;
        if (!!loadedUser) purchased = await this.UserCourseModel.exists({ user: loadedUser.user._id, course: course._id, status: "ok" });

        const numberOfVotes = await this.CourseRatingModel.countDocuments({ course: course._id }).exec();
        const numberOfTopVotes = await this.CourseRatingModel.countDocuments({ course: course._id, rating: 8 }).exec();

        const similarCourses = await this.CourseModel.find({ tags: { $in: course.tags || [] }, _id: { $ne: course._id }, status: "active" })
            .select("-oid -exerciseFiles -tags -status -commission -topics.order -topics.file -topics.isFree -topics.isFreeForUsers")
            .populate("teacher", "image name family")
            .populate("groups", "-_id icon name topGroup")
            .sort({ createdAt: "desc" })
            .limit(10)
            .exec();

        return res.json({ course, purchased, similarCourses, numberOfVotes, numberOfTopVotes });
    }
}
