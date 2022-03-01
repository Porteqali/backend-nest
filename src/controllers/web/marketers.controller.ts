import { readFile } from "fs/promises";
import { Controller, Get, InternalServerErrorException, Post, Req, Res, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { CourseDocument } from "src/models/courses.schema";
import { DiscountService } from "src/services/discount.service";
import { AnalyticsDocument } from "src/models/analytics.schema";
import { AnalyticsService } from "src/services/analytics.service";

@Controller("marketers")
export class MarketersController {
    constructor(
        private readonly discountService: DiscountService,
        private readonly analyticsService: AnalyticsService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
    ) {}

    @Post("/check-code/:code")
    async getAllTeachers(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const marketer = await this.UserModel.exists({ marketingCode: req.params.code, role: "marketer" });

        if (marketer) {
            // count the click for link
            await this.analyticsService.analyticCountUp(req, marketer, null, 1, "link-clicked", "marketer");

            return res.end();
        }

        return res.status(403).end();
    }
}
