import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { CourseDocument } from "src/models/courses.schema";

@Controller("admin/dashboard")
export class DashboardController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
    ) {}

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
