import { readFile } from "fs/promises";
import { Controller, Get, InternalServerErrorException, Post, Req, Res, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { CourseDocument } from "src/models/courses.schema";
import { AnalyticsService } from "src/services/analytics.service";
import { MarketerCoursesDocument } from "src/models/marketerCourses.schema";

@Controller("marketers")
export class MarketersController {
    constructor(
        private readonly analyticsService: AnalyticsService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("MarketerCourse") private readonly MarketerCourseModel: Model<MarketerCoursesDocument>,
    ) {}

    @Post("/check-code/:code")
    async getAllTeachers(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        let marketer = await this.UserModel.findOne({ marketingCode: req.params.code, role: "marketer" });

        if (marketer) {
            // count the click for link
            await this.analyticsService.analyticCountUp(req, marketer._id, null, 1, "link-clicked", "marketer");
            return res.json({ code: marketer.marketingCode });
        } else {
            // check the code for single course
            const marketerCourse: any = await this.MarketerCourseModel.findOne({ code: req.params.code, status: "active" })
                .populate("marketer", "_id marketingCode")
                .exec();
            if (marketerCourse) {
                await this.analyticsService.analyticCountUp(req, marketerCourse.marketer._id, null, 1, "link-clicked", "marketer");
                return res.json({ code: marketerCourse.marketer.marketingCode });
            }
        }

        return res.status(403).end();
    }
}
