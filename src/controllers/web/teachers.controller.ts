import { readFile } from "fs/promises";
import { Controller, Get, InternalServerErrorException, Post, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserDocument } from "src/models/users.schema";

@Controller("teachers")
export class TeachersController {
    constructor(@InjectModel("User") private readonly UserModel: Model<UserDocument>) {}

    @Get("/")
    async getAllTeachers(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const teachers = await this.UserModel.find({ role: "teacher", status: "active" })
            .select("image title name family groups description socials")
            .populate("groups", "icon name topGroup")
            .exec();

        let groupedTeachers = {};
        teachers.forEach((teacher) => {
            teacher.groups.forEach((group) => {
                if (typeof groupedTeachers[group.topGroup] === "undefined") groupedTeachers[group.topGroup] = [];
                groupedTeachers[group.topGroup].push(teacher);
            });
        });

        return res.json(groupedTeachers);
    }
}
