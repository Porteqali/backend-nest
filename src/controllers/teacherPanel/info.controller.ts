import { Body, Controller, Delete, Get, NotFoundException, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { AuthService } from "src/services/auth.service";
import { UserDocument } from "src/models/users.schema";

@Controller("teacher-panel/info")
export class InfoController {
    constructor(private readonly authService: AuthService, @InjectModel("User") private readonly UserModel: Model<UserDocument>) {}

    @Get("/")
    async getInfo(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "teacher", [], "AND"))) throw new ForbiddenException();

        const user = await this.UserModel.findOne({ _id: req.user.user._id }).select("_id name family description socials");
        return res.json({ user });
    }

    @Put("/")
    async editInfo(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "teacher", [], "AND"))) throw new ForbiddenException();

        const description = req.body.description || "";
        const socials = req.body.socials || [];

        // find user
        const user = await this.UserModel.findOne({ _id: req.user.user._id }).exec();
        if (!user) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);

        await this.UserModel.updateOne({ _id: req.user.user._id }, { description: description, socials: socials }).exec();

        return res.end();
    }
}
