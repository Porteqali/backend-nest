import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { CollaborateRequestDocument } from "src/models/collaborateRequests.schema";

@Controller("admin/collaborate-requests")
export class CollaborateRequestController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("CollaborateRequest") private readonly CollaborateRequestModel: Model<CollaborateRequestDocument>,
    ) {}

    @Get("/")
    async getRequests(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.collaborate-requests.view"])) throw new ForbiddenException();

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
            case "عنوان پیشنهادی":
                sort = { suggestiveRole: sortType };
                break;
            case "متن":
                sort = { description: sortType };
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
        let data = this.CollaborateRequestModel.aggregate();
        data.match(query);
        data.sort(sort);
        data.project({
            mobile: 1,
            fullname: { $concat: ["$name", " ", "$family"] },
            email: 1,
            suggestiveRole: 1,
            description: 1,
            status: 1,
            createdAt: 1,
        });
        data.match({
            $or: [
                { fullname: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { description: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { suggestiveRole: { $regex: new RegExp(`.*${search}.*`, "i") } },
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
        if (!this.authService.authorize(req, "admin", ["admin.collaborate-requests.view"])) throw new ForbiddenException();

        const request = await this.CollaborateRequestModel.findOne({ _id: req.params.id }).exec();
        if (!request) throw new NotFoundException();

        await this.CollaborateRequestModel.updateOne({ _id: req.params.id }, { status: "viewed" }).exec();

        return res.json(request);
    }

    @Delete("/:id")
    async deleteRequest(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.collaborate-requests.delete"])) throw new ForbiddenException();

        const data = await this.CollaborateRequestModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete the thing
        await this.CollaborateRequestModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
