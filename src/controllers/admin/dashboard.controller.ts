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

@Controller("admin/dashboard")
export class DashboardController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
    ) {}

    @Get("/general-details-info")
    async getGeneralDetails(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        // TODO
        return res.json({
            totalUsers: 0,
            lastMonthRegisters: 0,
            lastMonthRegistersPercentage: 12,
            usersThatMadePurchase: 3123,
            usersThatMadePurchasePercentage: 23,
            totalStudents: 0,
            totalMarketers: 0,
            totalTeachers: 0,
            totalAdmins: 0,

            totalPurchases: 0,
            lastMonthPurchases: 0,
            lastMonthPurchasesPercentage: 12,

            totalIncome: 0,
            lastMonthIncome: 0,
            lastMonthIncomePercentage: 12,

            activeCourseCount: 0,
            onlineUserCount: 0,
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

    @Get("/device-chart")
    async getDeviceChartInfo(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        // TODO
        const type = req.query.type ? req.query.type.toString() : "device";

        // device : Mobile | PC | unknown
        // browser : chrome | firefox | edge | opera | unknown
        // os : windows | linux | mac | android | ios | unknown

        return res.json({
            data: [2432, 523, 432, 432, 2432, 523],
            label: ["windows", "linux", "mac", "android", "ios", "unknown"],
        });
    }

    @Get("/most-viewed-courses")
    async getMostViewedCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        // TODO
        const courses = await this.CourseModel.find().select("-topics").populate("teacher", "image name family").limit(6).exec();
        return res.json(courses);
    }

    @Get("/most-sold-courses")
    async getMostSoldCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        // TODO
        const courses = await this.CourseModel.find().select("-topics").populate("teacher", "image name family").limit(6).exec();
        return res.json(courses);
    }
}