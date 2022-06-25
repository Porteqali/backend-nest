import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import * as Jmoment from "jalali-moment";
import { PermissionGroupDocument } from "src/models/permissionGroups.schema";
import { AuthService } from "src/services/auth.service";
import { DiscountDocument } from "src/models/discount.schema";
import { CourseDocument } from "src/models/courses.schema";
import { CourseGroupDocument } from "src/models/courseGroups.schema";
import { CreateNewDiscountDto, UpdateDiscountDto } from "src/dto/adminPanel/discounts.dto";
import { BundleDocument } from "src/models/bundles.schema";

@Controller("admin/discounts")
export class DiscountController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("PermissionGroup") private readonly PermissionGroupModel: Model<PermissionGroupDocument>,
        @InjectModel("Discount") private readonly DiscountModel: Model<DiscountDocument>,
        @InjectModel("Bundle") private readonly BundleModel: Model<BundleDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("CourseGroup") private readonly CourseGroupModel: Model<CourseGroupDocument>,
    ) {}

    @Get("/search/:query")
    async search(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.discounts.view"]))) throw new ForbiddenException();

        const search = req.params.query ? req.params.query.toString() : "";
        const section = req.query.section ? req.query.section.toString() : "course";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // making the model with query
        let data;
        switch (section) {
            case "bundle":
                data = this.BundleModel.aggregate();
                data.project({ _id: 1, image: 1, name: "$title" });
                data.match({ name: { $regex: new RegExp(`.*${search}.*`, "i") } });
                break;
            case "course":
                data = this.CourseModel.aggregate();
                data.project("_id image name");
                data.match({ name: { $regex: new RegExp(`.*${search}.*`, "i") } });
                break;
            case "courseGroup":
                data = this.CourseGroupModel.aggregate();
                data.project("_id icon name");
                data.match({ name: { $regex: new RegExp(`.*${search}.*`, "i") } });
                break;
            case "teacherCourses":
                data = this.UserModel.aggregate();
                data.match({ role: "teacher" });
                data.project({ _id: 1, image: 1, fullname: { $concat: ["$name", " ", "$family"] } });
                data.match({ $or: [{ fullname: { $regex: new RegExp(`.*${search}.*`, "i") } }, { email: { $regex: new RegExp(`.*${search}.*`, "i") } }] });
                break;
            case "singleUser":
                data = this.UserModel.aggregate();
                data.match({ role: "user" });
                data.project({ _id: 1, image: 1, fullname: { $concat: ["$name", " ", "$family"] } });
                data.match({
                    $or: [
                        { fullname: { $regex: new RegExp(`.*${search}.*`, "i") } },
                        { email: { $regex: new RegExp(`.*${search}.*`, "i") } },
                        { mobile: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    ],
                });
                break;
        }

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

    // =============================================================================

    @Get("/")
    async getDiscounts(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.discounts.view"]))) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "desc";
        switch (req.query.sort) {
            case "عنوان":
                sort = { name: sortType };
                break;
            case "مقدار":
                sort = { amount: sortType };
                break;
            case "زمان شروع":
                sort = { startDate: sortType };
                break;
            case "زمان پایان":
                sort = { endDate: sortType };
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
        let data = this.DiscountModel.aggregate();
        data.match(query);
        data.match({
            $or: [
                { name: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { code: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { amount: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { startDate: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { endDate: { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });
        data.sort(sort);
        data.project("_id name code amount amountType startDate endDate createdAt");

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

        // transform data
        results[0].data.map((row) => {
            row.tillTheStart = !!row.startDate ? Jmoment(row.startDate).locale("fa").fromNow() : "";
            row.tillTheEnd = !!row.endDate ? Jmoment(row.endDate).locale("fa").fromNow() : "";
            return row;
        });

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }

    @Get("/:id")
    async getDiscount(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.discounts.view"]))) throw new ForbiddenException();

        let discount: any = await this.DiscountModel.findOne({ _id: req.params.id }).exec();
        if (!discount) throw new NotFoundException();

        discount = discount.toJSON();
        switch (discount.emmitTo) {
            case "course":
                discount.emmitToData = await this.CourseModel.findOne({ _id: discount.emmitToId }).select("_id image name").exec();
                if (!discount.emmitToData) break;
                discount.emmitToData = discount.emmitToData.toJSON();
                break;
            case "courseGroup":
                discount.emmitToData = await this.CourseGroupModel.findOne({ _id: discount.emmitToId }).select("_id icon name").exec();
                if (!discount.emmitToData) break;
                discount.emmitToData = discount.emmitToData.toJSON();
                discount.emmitToData["image"] = discount.emmitToData.icon;
                break;
            case "teacherCourses":
                discount.emmitToData = await this.UserModel.findOne({ _id: discount.emmitToId }).select("_id image name family").exec();
                if (!discount.emmitToData) break;
                discount.emmitToData = discount.emmitToData.toJSON();
                discount.emmitToData["fullname"] = `${discount.emmitToData.name} ${discount.emmitToData.family}`;
                discount.emmitToData["name"] = undefined;
                break;
            case "singleUser":
                discount.emmitToData = await this.UserModel.findOne({ _id: discount.emmitToId }).select("_id image name family").exec();
                if (!discount.emmitToData) break;
                discount.emmitToData = discount.emmitToData.toJSON();
                discount.emmitToData["fullname"] = `${discount.emmitToData.name} ${discount.emmitToData.family}`;
                discount.emmitToData["name"] = undefined;
                break;
        }

        return res.json(discount);
    }

    @Post("/")
    async addDiscount(@Body() input: CreateNewDiscountDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.discounts.add"]))) throw new ForbiddenException();

        const startDate = Jmoment.from(input.startDate, "fa").add("day", 1).toDate();
        const endDate = Jmoment.from(input.endDate, "fa").add("day", 1).toDate();

        await this.DiscountModel.create({
            name: input.name,
            type: input.type,
            amount: input.amount,
            amountType: input.amountType,
            startDate: startDate,
            endDate: endDate,
            status: input.status,
            emmitTo: input.emmitTo,
            emmitToId: input.emmitToId || null,
            code: input.code || null,
            createdAt: new Date(Date.now()),
        });

        return res.end();
    }

    @Put("/:id")
    async editDiscount(@Body() input: UpdateDiscountDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.discounts.edit"]))) throw new ForbiddenException();

        const startDate = Jmoment.from(input.startDate, "fa").add("day", 1).toDate();
        const endDate = Jmoment.from(input.endDate, "fa").add("day", 1).toDate();

        const emmitToId: any = input.emmitToId;

        await this.DiscountModel.updateOne(
            { _id: req.params.id },
            {
                name: input.name,
                type: input.type,
                amount: input.amount,
                amountType: input.amountType,
                startDate: startDate,
                endDate: endDate,
                status: input.status,
                emmitTo: input.emmitTo,
                emmitToId: emmitToId || null,
                code: input.code || null,
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deleteDiscount(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.discounts.delete"]))) throw new ForbiddenException();

        const data = await this.DiscountModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete the thing
        await this.DiscountModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
