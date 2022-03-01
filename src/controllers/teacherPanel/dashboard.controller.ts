import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { CourseDocument } from "src/models/courses.schema";
import * as Jmoment from "jalali-moment";
import * as moment from "moment";
import { CommissionPaymentDocument } from "src/models/commissionPayments.schema";
import { CourseAnalyticDocument } from "src/models/courseAnalytics.schema";

@Controller("teacher-panel/dashboard")
export class DashboardController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("CommissionPayment") private readonly CommissionPaymentModel: Model<CommissionPaymentDocument>,
        @InjectModel("CourseAnalytic") private readonly CourseAnalyticModel: Model<CourseAnalyticDocument>,
    ) {}

    @Get("/general-details-info")
    async getGeneralDetails(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        // TODO
        const startOfLastMonth = moment().startOf("month").subtract(2, "days").format("YYYY-MM-01T12:00:00");
        const endOfLastMonth = moment().startOf("month").subtract(1, "day").format("YYYY-MM-DDT12:00:00");
        const startOfMonth = moment().startOf("month").toDate();
        const endOfMonth = moment().endOf("month").add(1, "day").toDate();

        const totalPayedCommissionQuery = this.CommissionPaymentModel.aggregate();
        totalPayedCommissionQuery.match({ user: req.user.user._id });
        totalPayedCommissionQuery.group({ _id: null, total: { $sum: "$payedAmount" } });
        const totalPayedCommission = await totalPayedCommissionQuery.exec();

        console.log(totalPayedCommission);

        return res.json({
            totalSells: 0,
            lastMonthSells: 0,
            lastMonthSellsPercentage: 12,

            totalIncome: 0,
            lastMonthIncome: 0,
            lastMonthIncomePercentage: 12,

            totalPayedCommission: totalPayedCommission[0] ? totalPayedCommission[0].total : 0,
            commissionBalance: req.user.user.commissionBalance,
        });
    }

    @Get("/main-chart")
    async getMainChartInfo(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        // TODO
        const inputStartDate = req.query.startDate ? req.query.startDate.toString() : Jmoment(Date.now()).subtract("1", "day").format("jYYYY-jMM-jDDThh:mm:ss");
        const inputEndDate = req.query.endDate ? req.query.endDate.toString() : Jmoment(Date.now()).format("jYYYY-jMM-jDDThh:mm:ss");

        const startDate = Jmoment.from(inputStartDate, "fa", "YYYY-MM-DD hh:mm:ss");
        startDate.add("minutes", 206);
        const endDate = Jmoment.from(inputEndDate, "fa", "YYYY-MM-DD hh:mm:ss");
        endDate.add("minutes", 206);

        const data = [];
        const label = [];
        const count = Math.floor(Math.random() * (30 - 10 + 1)) + 10;
        for (let i = 0; i <= count; i++) {
            data.push(Math.floor(Math.random() * (5000 - 10 + 1)) + 10);
            label.push(`data#${i.toString()}`);
        }

        return res.json({ data, label, startDate: inputStartDate, endDate: inputEndDate });
    }

    @Get("/most-viewed-courses")
    async getMostViewedCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        // list the teacher active courses
        const teacherCourseList = [];
        const teacherCourses = await this.CourseModel.find({ status: "active", teacher: req.user.user._id }).exec();
        teacherCourses.forEach((item) => teacherCourseList.push(item._id));

        let type = "today";
        switch (req.query.period) {
            case "yesterday":
                type = "yesterday";
                break;
            case "this-month":
                type = "current-month";
                break;
            case "last-month":
                type = "last-month";
                break;
        }
        const courseAnalytics = await this.CourseAnalyticModel.find({ type: type, course: { $in: teacherCourseList } })
            .sort({ viewCount: "desc" })
            .select("course")
            .limit(6)
            .exec();
        const courseIds = [];
        const courses = [];
        courseAnalytics.forEach((item) => {
            courses.push(item.toJSON());
            courseIds.push(item.course);
        });

        for (let i = 0; i < courses.length; i++) {
            const courseInfo = await this.CourseModel.findOne({ _id: courses[i].course }).select("-topics").populate("teacher", "image name family").limit(6).exec();
            courses[i].info = courseInfo;
        }

        return res.json(courses);
    }

    @Get("/most-sold-courses")
    async getMostSoldCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        // list the teacher active courses
        const teacherCourseList = [];
        const teacherCourses = await this.CourseModel.find({ status: "active", teacher: req.user.user._id }).exec();
        teacherCourses.forEach((item) => teacherCourseList.push(item._id));

        let type = "today";
        switch (req.query.period) {
            case "yesterday":
                type = "yesterday";
                break;
            case "this-month":
                type = "current-month";
                break;
            case "last-month":
                type = "last-month";
                break;
        }
        const courseAnalytics = await this.CourseAnalyticModel.find({ type: type, course: { $in: teacherCourseList } })
            .sort({ buyCount: "desc" })
            .select("course")
            .limit(6)
            .exec();
        const courseIds = [];
        const courses = [];
        courseAnalytics.forEach((item) => {
            courses.push(item.toJSON());
            courseIds.push(item.course);
        });

        for (let i = 0; i < courses.length; i++) {
            const courseInfo = await this.CourseModel.findOne({ _id: courses[i].course }).select("-topics").populate("teacher", "image name family").limit(6).exec();
            courses[i].info = courseInfo;
        }

        return res.json(courses);
    }
}
