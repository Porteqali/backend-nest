import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CourseDocument } from "src/models/courses.schema";
import { UserDocument } from "src/models/users.schema";
import { duration } from "jalali-moment";

@Controller()
export class CoursesController {
    constructor(@InjectModel("Course") private readonly CourseModel: Model<CourseDocument>, @InjectModel("User") private readonly UserModel: Model<UserDocument>) {}

    @Get("/most-viewed-courses")
    async getMostViewdCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const courses = await this.CourseModel.find({ status: "active" })
            .select("-oid -exerciseFiles -tags -status -commission -buyCount -topics.order -topics.file -topics.isFree -topics.isFreeForUsers")
            .populate("teacher", "-_id image name family")
            .populate("groups", "-_id icon name topGroup")
            .sort({ viewCount: "desc" })
            .limit(2)
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
        teachersQuery.project("image title name family description socials courses.name courses.description courses.groups.icon courses.groups.name courses.topics");
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

        // return res.json(modifiedTeachers);
        return res.json(teachers);
    }
}
