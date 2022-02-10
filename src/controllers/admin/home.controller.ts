import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { CollaborateRequestDocument } from "src/models/collaborateRequests.schema";
import { ContactRequestDocument } from "src/models/contactRequests.schema";

@Controller("admin/home")
export class HomeController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("CollaborateRequest") private readonly CollaborateRequestModel: Model<CollaborateRequestDocument>,
        @InjectModel("ContactRequest") private readonly ContactRequestModel: Model<ContactRequestDocument>,
    ) {}

    @Get("/newRequestCounts")
    async getNewRequestCounts(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.collaborate-requests.view", "admin.contact-requests.view"], "OR")) throw new ForbiddenException();

        const collabRequestCount = await this.CollaborateRequestModel.countDocuments({ status: "new" }).exec();
        const contactRequestCount = await this.ContactRequestModel.countDocuments({ status: "new" }).exec();

        return res.json({ collabRequestCount, contactRequestCount });
    }

    @Get("/notifications")
    async getNotifications(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.collaborate-requests.view", "admin.contact-requests.view"], "OR")) throw new ForbiddenException();

        let notifications = [];

        const collabRequests = await this.CollaborateRequestModel.find({ status: "new" }).exec();
        for (let i = 0; i < collabRequests.length; i++) {
            notifications.push({
                icon: "/icons/admin/HandShake.svg",
                title: "درخواست همکاری جدید",
                text: `پیام درخواست همکاری جدید با عنوان ${collabRequests[i].suggestiveRole}`,
                link: `/admin/collaborate-requests/details/${collabRequests[i]._id}`,
            });
        }

        const contactRequests = await this.ContactRequestModel.find({ status: "new" }).exec();
        for (let i = 0; i < contactRequests.length; i++) {
            notifications.push({
                icon: "/icons/admin/Calling.svg",
                title: "پیام جدید",
                text: `پیام جدید با موضوع ${contactRequests[i].issue}`,
                link: `/admin/contact-requests/details/${contactRequests[i]._id}`,
            });
        }

        return res.json(notifications);
    }
}
