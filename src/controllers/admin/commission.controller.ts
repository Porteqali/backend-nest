import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { PermissionGroupDocument } from "src/models/permissionGroups.schema";
import { AuthService } from "src/services/auth.service";
import { CommissionDocument } from "src/models/commissions.schema";
import { CreateNewCommissionDto, UpdateCommissionDto } from "src/dto/adminPanel/commissions.dto";

@Controller("admin/commissions")
export class CommissionController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("PermissionGroup") private readonly PermissionGroupModel: Model<PermissionGroupDocument>,
        @InjectModel("Commission") private readonly CommissionModel: Model<CommissionDocument>,
    ) {}

    @Get("/")
    async getCommissions(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.commissions.view"])) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "desc";
        switch (req.query.sort) {
            case "نام":
                sort = { name: sortType };
                break;
            case "نوع":
                sort = { type: sortType };
                break;
            case "مقدار":
                sort = { amount: sortType };
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
        let data = this.CommissionModel.aggregate();
        data.match(query);
        data.match({
            $or: [
                { name: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { type: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { amount: { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });
        data.sort(sort);
        data.project("_id name type amount createdAt");

        // paginating
        data = data.facet({
            data: [{ $skip: (page - 1) * pp }, { $limit: pp }],
            total: [{ $group: { _id: null, count: { $sum: 1 } } }],
        });

        // executing query and getting the results
        let error = false;
        const results = await data.exec().catch((e) => (error = true));
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
    async getCommission(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.commissions.view"])) throw new ForbiddenException();

        const commission = await this.CommissionModel.findOne({ _id: req.params.id }).exec();
        if (!commission) throw new NotFoundException();
        return res.json(commission);
    }

    @Post("/")
    async addCommission(@Body() input: CreateNewCommissionDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.commissions.add"])) throw new ForbiddenException();

        await this.CommissionModel.create({
            name: input.name,
            type: input.type,
            amount: input.amount,
        });

        return res.end();
    }

    @Put("/:id")
    async editCommission(@Body() input: UpdateCommissionDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.commissions.edit"])) throw new ForbiddenException();

        await this.CommissionModel.updateOne(
            { _id: req.params.id },
            {
                name: input.name,
                type: input.type,
                amount: input.amount,
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deleteCommission(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.commissions.delete"])) throw new ForbiddenException();

        const data = await this.CommissionModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete the thing
        await this.CommissionModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
