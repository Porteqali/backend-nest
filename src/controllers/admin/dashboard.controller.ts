import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as Jmoment from "jalali-moment";
import * as moment from "moment";
import * as platformjs from "platform";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { CourseDocument } from "src/models/courses.schema";
import { UserCourseDocument } from "src/models/userCourses.schema";
import { SessionDocument } from "src/models/sessions.schema";
import { CourseAnalyticDocument } from "src/models/courseAnalytics.schema";
import { AnalyticsDocument } from "src/models/analytics.schema";

@Controller("admin/dashboard")
export class DashboardController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Session") private readonly SessionModel: Model<SessionDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
        @InjectModel("CourseAnalytic") private readonly CourseAnalyticModel: Model<CourseAnalyticDocument>,
        @InjectModel("Analytic") private readonly AnalyticModel: Model<AnalyticsDocument>,
    ) {}

    @Get("/general-details-info")
    async getGeneralDetails(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        // date ranges
        const startOfLastMonth = moment().startOf("month").subtract(2, "days").format("YYYY-MM-01T12:00:00");
        const endOfLastMonth = moment().startOf("month").subtract(1, "day").format("YYYY-MM-DDT12:00:00");
        const startOfMonth = moment().startOf("month").toDate();
        const endOfMonth = moment().endOf("month").add(1, "day").toDate();

        // total users in details
        const totalUsers = await this.UserModel.countDocuments().exec();
        const totalMarketers = await this.UserModel.countDocuments({ role: "marketer" }).exec();
        const totalTeachers = await this.UserModel.countDocuments({ role: "teacher" }).exec();
        const totalAdmins = await this.UserModel.countDocuments({ role: "admin" }).exec();
        const totalStudents = totalUsers - (totalMarketers + totalTeachers + totalAdmins);

        // ==========================
        let lastMonthRegistersQuery: any = this.UserModel.aggregate();
        lastMonthRegistersQuery.match({ status: "active", role: "user", createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } });
        lastMonthRegistersQuery.count("count");
        lastMonthRegistersQuery = await lastMonthRegistersQuery.exec();
        const lastMonthRegisters = lastMonthRegistersQuery[0] ? lastMonthRegistersQuery[0].count : 0;

        let currentMonthRegistersQuery: any = this.UserModel.aggregate();
        currentMonthRegistersQuery.match({ status: "active", role: "user", createdAt: { $gte: startOfMonth, $lte: endOfMonth } });
        currentMonthRegistersQuery.count("count");
        currentMonthRegistersQuery = await currentMonthRegistersQuery.exec();
        const currentMonthRegisters = currentMonthRegistersQuery[0] ? currentMonthRegistersQuery[0].count : 0;

        let lastMonthRegistersPercentage = "0";
        if (lastMonthRegisters == 0) lastMonthRegistersPercentage = currentMonthRegisters != 0 ? "100" : "0";
        else if (currentMonthRegisters == 0) lastMonthRegistersPercentage = lastMonthRegisters != 0 ? "-100" : "0";
        else lastMonthRegistersPercentage = (((currentMonthRegisters - lastMonthRegisters) / lastMonthRegisters) * 100).toFixed(2);
        // ==========================

        // ==========================
        const usersThatMadePurchaseQuery = await this.UserCourseModel.aggregate().match({ status: "ok" }).group({ _id: "$user" }).count("count").exec();
        const usersThatMadePurchase = usersThatMadePurchaseQuery[0] ? usersThatMadePurchaseQuery[0].count : 0;

        const totalPurchasesQuery = await this.UserCourseModel.aggregate().match({ status: "ok" }).group({ _id: "$authority" }).count("count").exec();
        const totalPurchases = totalPurchasesQuery[0] ? totalPurchasesQuery[0].count : 0;
        // ==========================

        // ==========================
        let lastMonthPurchasesQuery: any = this.UserCourseModel.aggregate();
        lastMonthPurchasesQuery.match({ status: "ok", createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } });
        lastMonthPurchasesQuery.group({ _id: "$authority" });
        lastMonthPurchasesQuery.count("count");
        lastMonthPurchasesQuery = await lastMonthPurchasesQuery.exec();
        const lastMonthPurchases = lastMonthPurchasesQuery[0] ? lastMonthPurchasesQuery[0].count : 0;

        let currentMonthPurchasesQuery: any = this.UserCourseModel.aggregate();
        currentMonthPurchasesQuery.match({ status: "ok", createdAt: { $gte: startOfMonth, $lte: endOfMonth } });
        currentMonthPurchasesQuery.group({ _id: "$authority" });
        currentMonthPurchasesQuery.count("count");
        currentMonthPurchasesQuery = await currentMonthPurchasesQuery.exec();
        const currentMonthPurchases = currentMonthPurchasesQuery[0] ? currentMonthPurchasesQuery[0].count : 0;

        let lastMonthPurchasesPercentage = "0";
        if (lastMonthPurchases == 0) lastMonthPurchasesPercentage = currentMonthPurchases != 0 ? "100" : "0";
        else if (currentMonthPurchases == 0) lastMonthPurchasesPercentage = lastMonthPurchases != 0 ? "-100" : "0";
        else lastMonthPurchasesPercentage = (((currentMonthPurchases - lastMonthPurchases) / lastMonthPurchases) * 100).toFixed(2);
        // ==========================

        // ==========================
        let lastMonthIncomeQuery: any = this.AnalyticModel.aggregate();
        lastMonthIncomeQuery.match({ type: "monthly", forGroup: "total", infoName: "income" });
        lastMonthIncomeQuery.match({ date: { $gte: startOfLastMonth, $lte: endOfLastMonth } });
        lastMonthIncomeQuery = await lastMonthIncomeQuery.project("count").limit(1).exec();
        const lastMonthIncome = lastMonthIncomeQuery[0] ? lastMonthIncomeQuery[0].count : 0;

        let currentMonthIncomeQuery: any = this.AnalyticModel.aggregate();
        currentMonthIncomeQuery.match({ type: "monthly", forGroup: "total", infoName: "income" });
        currentMonthIncomeQuery.match({ date: { $gte: startOfMonth, $lte: endOfMonth } });
        currentMonthIncomeQuery = await currentMonthIncomeQuery.project("count").limit(1).exec();
        const currentMonthIncome = currentMonthIncomeQuery[0] ? currentMonthIncomeQuery[0].count : 0;

        let lastMonthIncomePercentage = "0";
        if (lastMonthIncome == 0) lastMonthIncomePercentage = currentMonthIncome != 0 ? "100" : "0";
        else if (currentMonthIncome == 0) lastMonthIncomePercentage = lastMonthIncome != 0 ? "-100" : "0";
        else lastMonthIncomePercentage = (((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100).toFixed(2);
        // ==========================

        let totalIncomeQuery: any = this.AnalyticModel.aggregate();
        totalIncomeQuery.match({ type: "monthly", forGroup: "total", infoName: "income" });
        totalIncomeQuery.group({ _id: null, total: { $sum: "$count" } });
        totalIncomeQuery = await totalIncomeQuery.project("count").limit(1).exec();
        const totalIncome = totalIncomeQuery[0] ? totalIncomeQuery[0].total : 0;

        const minimumOnlineTimePeriod = moment().subtract(10, "minutes").toDate();
        const onlineUserCount = await this.SessionModel.countDocuments({ updatedAt: { $gt: minimumOnlineTimePeriod } }).exec();

        const activeCourseCount = await this.CourseModel.countDocuments({ status: "active" }).exec();

        return res.json({
            totalUsers: totalUsers,
            lastMonthRegisters: lastMonthRegisters,
            lastMonthRegistersPercentage: lastMonthRegistersPercentage,
            usersThatMadePurchase: usersThatMadePurchase,
            usersThatMadePurchasePercentage: ((usersThatMadePurchase / totalUsers) * 100).toFixed(2),
            totalStudents,
            totalMarketers,
            totalTeachers,
            totalAdmins,

            totalPurchases: totalPurchases,
            lastMonthPurchases: lastMonthPurchases,
            lastMonthPurchasesPercentage: lastMonthPurchasesPercentage,

            totalIncome: totalIncome,
            lastMonthIncome: lastMonthIncome,
            lastMonthIncomePercentage: lastMonthIncomePercentage,

            activeCourseCount: activeCourseCount,
            onlineUserCount: onlineUserCount,
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
        analyticsQuery.match({ forGroup: "total", infoName: type });
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

    @Get("/device-chart")
    async getDeviceChartInfo(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const type = req.query.type ? req.query.type.toString() : "browser";

        const sessionsQuery = this.SessionModel.find({ expireAt: { $gt: new Date(Date.now()) } }).select("userAgent");
        sessionsQuery.limit(10_000);
        const sessions = await sessionsQuery.exec();

        const data = [];
        const label = [];
        for (let i = 0; i < sessions.length; i++) {
            const userAgent = sessions[i].userAgent || "";
            const info = platformjs.parse(userAgent);
            let name = "unknown";
            switch (type) {
                case "browser":
                    name = info.name ? info.name : "unknown";
                    break;
                case "os":
                    name = info.os && info.os.family ? info.os.family : "unknown";
                    break;
            }
            if (label.indexOf(name) === -1) {
                label.push(name);
                data.push(1);
            } else data[label.indexOf(name)] += 1;
        }

        return res.json({
            data: data,
            label: label,
        });
    }

    @Get("/most-viewed-courses")
    async getMostViewedCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
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
        const courseAnalytics = await this.CourseAnalyticModel.find({ type: type }).sort({ viewCount: "desc" }).select("course viewCount").limit(6).exec();
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
        const courseAnalytics = await this.CourseAnalyticModel.find({ type: type }).sort({ buyCount: "desc" }).select("course buyCount").limit(6).exec();
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

    @Get("/user-locations")
    async getUserLocations(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const total = await this.SessionModel.countDocuments({ expireAt: { $gt: new Date(Date.now()) } }).exec();

        const sessionsQuery = this.SessionModel.aggregate();
        sessionsQuery.match({ expireAt: { $gt: new Date(Date.now()) } });
        sessionsQuery.group({ _id: "$location", count: { $sum: 1 } });
        sessionsQuery.sort({ count: "desc" });
        sessionsQuery.limit(10);
        const sessions = await sessionsQuery.exec();

        const colors = ["#222", "#333", "#444", "#555", "#666", "#777", "#888", "#999", "#aaa", "#bbb", "#ccc", "#ddd", "#eee"];
        const info = [];
        for (let i = 0; i < sessions.length; i++) {
            const location = sessions[i]._id ? sessions[i]._id : "unknown";
            info.push({
                location: location,
                count: sessions[i].count,
                color: colors[i] || "#eee",
            });
        }

        return res.json({
            info: info,
            total: total,
        });
    }
}
