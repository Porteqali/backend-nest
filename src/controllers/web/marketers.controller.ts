import { readFile } from "fs/promises";
import { Controller, Get, InternalServerErrorException, Post, Req, Res, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { CourseDocument } from "src/models/courses.schema";
import { DiscountService } from "src/services/discount.service";

@Controller("marketers")
export class MarketersController {
    constructor(
        private readonly discountService: DiscountService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
    ) {}

    @Post("/check-code/:code")
    async getAllTeachers(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const marketer = await this.UserModel.exists({ marketingCode: req.params.code, role: "marketer" });
        
        if (marketer) return res.end();
        return res.status(403).end();
    }
}
