import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { CourseDocument } from "src/models/courses.schema";
import { CommissionPaymentDocument } from "src/models/commissionPayments.schema";
import * as Jmoment from "jalali-moment";
import * as moment from "moment";
import { CourseAnalyticDocument } from "src/models/courseAnalytics.schema";
import { MarketerCoursesDocument } from "src/models/marketerCourses.schema";
import { AnalyticsDocument } from "src/models/analytics.schema";

@Controller("marketer-panel/dashboard")
export class DashboardController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("CommissionPayment") private readonly CommissionPaymentModel: Model<CommissionPaymentDocument>,
        @InjectModel("CourseAnalytic") private readonly CourseAnalyticModel: Model<CourseAnalyticDocument>,
        @InjectModel("MarketerCourse") private readonly MarketerCourseModel: Model<MarketerCoursesDocument>,
        @InjectModel("Analytic") private readonly AnalyticModel: Model<AnalyticsDocument>,
    ) {}

    @Get("/marketing-code")
    async getMarketingCode(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        return res.json({
            code: req.user.user.marketingCode || "",
        });
    }

    @Get("/general-details-info")
    async getGeneralDetails(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const startOfLastMonth = moment().startOf("month").subtract(2, "days").format("YYYY-MM-01T12:00:00");
        const endOfLastMonth = moment().startOf("month").subtract(1, "day").format("YYYY-MM-DDT12:00:00");
        const startOfMonth = moment().startOf("month").toDate();
        const endOfMonth = moment().endOf("month").add(1, "day").toDate();

        // ==========================
        let lastMonthIncomeQuery: any = this.AnalyticModel.aggregate();
        lastMonthIncomeQuery.match({ marketer: req.user.user._id, type: "monthly", forGroup: "marketer", infoName: "income" });
        lastMonthIncomeQuery.match({ date: { $gte: startOfLastMonth, $lte: endOfLastMonth } });
        lastMonthIncomeQuery = await lastMonthIncomeQuery.project("count").limit(1).exec();
        const lastMonthIncome = lastMonthIncomeQuery[0] ? lastMonthIncomeQuery[0].count : 0;

        let currentMonthIncomeQuery: any = this.AnalyticModel.aggregate();
        currentMonthIncomeQuery.match({ marketer: req.user.user._id, type: "monthly", forGroup: "marketer", infoName: "income" });
        currentMonthIncomeQuery.match({ date: { $gte: startOfMonth, $lte: endOfMonth } });
        currentMonthIncomeQuery = await currentMonthIncomeQuery.project("count").limit(1).exec();
        const currentMonthIncome = currentMonthIncomeQuery[0] ? currentMonthIncomeQuery[0].count : 0;

        let lastMonthIncomePercentage = "0";
        if (lastMonthIncome == 0) lastMonthIncomePercentage = currentMonthIncome != 0 ? "100" : "0";
        else if (currentMonthIncome == 0) lastMonthIncomePercentage = lastMonthIncome != 0 ? "-100" : "0";
        else lastMonthIncomePercentage = (((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100).toFixed(2);
        // ==========================

        let totalIncomeQuery: any = this.AnalyticModel.aggregate();
        totalIncomeQuery.match({ marketer: req.user.user._id, type: "monthly", forGroup: "marketer", infoName: "income" });
        totalIncomeQuery.group({ _id: null, total: { $sum: "$count" } });
        totalIncomeQuery = await totalIncomeQuery.project("count total").limit(1).exec();
        const totalIncome = totalIncomeQuery[0] ? totalIncomeQuery[0].total : 0;

        // ==========================
        let lastMonthSellsQuery: any = this.AnalyticModel.aggregate();
        lastMonthSellsQuery.match({ marketer: req.user.user._id, type: "monthly", forGroup: "marketer", infoName: "sells" });
        lastMonthSellsQuery.match({ date: { $gte: startOfLastMonth, $lte: endOfLastMonth } });
        lastMonthSellsQuery = await lastMonthSellsQuery.project("count").limit(1).exec();
        const lastMonthSells = lastMonthSellsQuery[0] ? lastMonthSellsQuery[0].count : 0;

        let currentMonthSellsQuery: any = this.AnalyticModel.aggregate();
        currentMonthSellsQuery.match({ marketer: req.user.user._id, type: "monthly", forGroup: "marketer", infoName: "sells" });
        currentMonthSellsQuery.match({ date: { $gte: startOfMonth, $lte: endOfMonth } });
        currentMonthSellsQuery = await currentMonthSellsQuery.project("count").limit(1).exec();
        const currentMonthSells = currentMonthSellsQuery[0] ? currentMonthSellsQuery[0].count : 0;

        let lastMonthSellsPercentage = "0";
        if (lastMonthSells == 0) lastMonthSellsPercentage = currentMonthSells != 0 ? "100" : "0";
        else if (currentMonthSells == 0) lastMonthSellsPercentage = lastMonthSells != 0 ? "-100" : "0";
        else lastMonthSellsPercentage = (((currentMonthSells - lastMonthSells) / lastMonthSells) * 100).toFixed(2);
        // ==========================

        let totalSellsQuery: any = this.AnalyticModel.aggregate();
        totalSellsQuery.match({ marketer: req.user.user._id, type: "monthly", forGroup: "marketer", infoName: "sells" });
        totalSellsQuery.group({ _id: null, total: { $sum: "$count" } });
        totalSellsQuery = await totalSellsQuery.project("count total").limit(1).exec();
        const totalSells = totalSellsQuery[0] ? totalSellsQuery[0].total : 0;

        const totalPayedCommissionQuery = this.CommissionPaymentModel.aggregate();
        totalPayedCommissionQuery.match({ user: req.user.user._id });
        totalPayedCommissionQuery.group({ _id: null, total: { $sum: "$payedAmount" } });
        const totalPayedCommission = await totalPayedCommissionQuery.exec();

        return res.json({
            totalSells: totalSells,
            lastMonthSells: lastMonthSells,
            lastMonthSellsPercentage: lastMonthSellsPercentage,

            totalIncome: totalIncome,
            lastMonthIncome: lastMonthIncome,
            lastMonthIncomePercentage: lastMonthIncomePercentage,

            totalPayedCommission: totalPayedCommission[0] ? totalPayedCommission[0].total : 0,
            commissionBalance: req.user.user.commissionBalance,
        });
    }

    @Get("/main-chart")
    async getMainChartInfo(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const type = req.query.type;
        const inputStartDate = req.query.startDate ? req.query.startDate.toString() : Jmoment(Date.now()).subtract("15", "day").format("jYYYY-jMM-jDDThh:mm:ss");
        const inputEndDate = req.query.endDate ? req.query.endDate.toString() : Jmoment(Date.now()).format("jYYYY-jMM-jDDThh:mm:ss");

        const startDate = Jmoment.from(inputStartDate, "fa", "YYYY-MM-DD hh:mm:ss");
        startDate.add("minutes", 206);
        const endDate = Jmoment.from(inputEndDate, "fa", "YYYY-MM-DD hh:mm:ss");
        endDate.add("minutes", 206);

        const diffInDays = endDate.diff(startDate, "days");
        if (diffInDays <= 0) throw new UnprocessableEntityException([{ property: "date", errors: ["بازه تاریخ ها جابه جاست"] }]);

        let analyticsQuery = this.AnalyticModel.aggregate();
        analyticsQuery.match({ date: { $gte: startDate.toDate(), $lte: endDate.toDate() } });
        analyticsQuery.match({ marketer: req.user.user._id, forGroup: "marketer", infoName: type });
        // if its less than 30 days: get the data for that period with type of daily from analytics
        analyticsQuery.match({ type: diffInDays <= 30 ? "daily" : "monthly" });
        const analyticsData = await analyticsQuery.sort({ date: "desc" }).exec();

        const data = [];
        const label = [];
        for (let i = 0; i < analyticsData.length; i++) {
            const record = analyticsData[0];
            if (diffInDays <= 30) {
                data.push(parseInt(record.count));
                label.push(Jmoment(record.date).locale("fa").subtract(1, "day").format("jMMM jDD").toString());
            } else if (30 < diffInDays && diffInDays <= 365) {
                data.push(parseInt(record.count));
                label.push(Jmoment(record.date).locale("fa").format("jYYYY jMMM").toString());
            } else {
                const labelName = Jmoment(record.date).locale("fa").format("jYYYY").toString();
                if (label.indexOf(labelName) === -1) {
                    data.push(parseInt(record.count));
                    label.push(labelName);
                } else data[label.indexOf(labelName)] += parseInt(record.count);
            }
        }

        return res.json({ data, label, startDate: inputStartDate, endDate: inputEndDate });
    }

    @Get("/most-sold-courses")
    async getMostSoldCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        // list the marketer active courses
        const marketerCourseList = [];
        const marketerCourses = await this.MarketerCourseModel.find({ status: "active", marketer: req.user.user._id }).select("course").exec();
        marketerCourses.forEach((item) => marketerCourseList.push(item.course));

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
        const courseAnalytics = await this.CourseAnalyticModel.find({ type: type, course: { $in: marketerCourseList } })
            .sort({ buyCount: "desc" })
            .select("course buyCount")
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
