import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserDocument } from "src/models/users.schema";

@Controller("about-us")
export class AboutUsController {
    constructor(@InjectModel("User") private readonly UserModel: Model<UserDocument>) {}

    @Get("/teachers")
    async getTeachers(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const teachers = await this.UserModel.find({ role: "teacher", status: "active" })
            .select("image title name family description socials")
            .sort({ createdAt: "desc" })
            .limit(8)
            .exec();

        return res.json(teachers);
    }
}
