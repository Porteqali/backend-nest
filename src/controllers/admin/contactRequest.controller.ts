import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { ContactRequestDocument } from "src/models/contactRequests.schema";

@Controller("admin/contact-requests")
export class ContactRequestController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("ContactRequest") private readonly ContactRequestModel: Model<ContactRequestDocument>,
    ) {}

    @Get("/")
    async getRequests(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.contact-requests.view"])) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "asc";
        switch (req.query.sort) {
            case "کاربر":
                sort = { fullname: sortType };
                break;
            case "عنوان":
                sort = { issue: sortType };
                break;
            case "متن":
                sort = { message: sortType };
                break;
            case "وضعیت":
                sort = { status: sortType };
                break;
            default:
                sort = { createdAt: sortType };
                break;
        }

        // the base query object
        let query = {};

        // filters
        // ...

        // making the model with query
        let data = this.ContactRequestModel.aggregate();
        data.match(query);
        data.sort(sort);
        data.project({
            fullname: { $concat: ["$name", " ", "$family"] },
            mobile: 1,
            email: 1,
            issue: 1,
            message: 1,
            status: 1,
            createdAt: 1,
        });
        data.match({
            $or: [
                { fullname: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { issue: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { message: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { email: { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });

        // paginating
        data = data.facet({
            data: [{ $skip: (page - 1) * pp }, { $limit: pp }],
            total: [{ $group: { _id: null, count: { $sum: 1 } } }],
        });

        // executing query and getting the results
        let error = false;
        const results = await data.exec().catch((e) => {
            error = true;
            console.log(e);
        });
        if (error) throw new InternalServerErrorException();
        const total = results[0].total[0] ? results[0].total[0].count : 0;

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }

    @Get("/:id")
    async getRequestDetails(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.contact-requests.view"])) throw new ForbiddenException();

        const request = await this.ContactRequestModel.findOne({ _id: req.params.id }).exec();
        if (!request) throw new NotFoundException();

        await this.ContactRequestModel.updateOne({ _id: req.params.id }, { status: "viewed" }).exec();

        return res.json(request);
    }

    @Delete("/:id")
    async deleteRequest(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.contact-requests.delete"])) throw new ForbiddenException();

        const data = await this.ContactRequestModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete the thing
        await this.ContactRequestModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
