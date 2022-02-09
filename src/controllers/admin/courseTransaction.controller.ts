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
import { WalletTransactionDocument } from "src/models/walletTransactions.schema";
import { UserCourseDocument } from "src/models/userCourses.schema";

@Controller("admin/course-transactions")
export class CourseTransactionController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("PermissionGroup") private readonly PermissionGroupModel: Model<PermissionGroupDocument>,
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
    ) {}

    // =============================================================================

    @Get("/")
    async getTransactions(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.course-transactions.view"])) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "asc";
        switch (req.query.sort) {
            case "کاربر":
                sort = { "info.user.name": sortType, "info.user.family": sortType };
                break;
            case "دوره":
                sort = { "info.course.name": sortType };
                break;
            case "کد تراکنش":
                sort = { "info.transactionCode": sortType };
                break;
            case "مبلغ کل":
                sort = { "info.totalPrice": sortType };
                break;
            case "مبلغ پرداختی":
                sort = { "info.paidAmount": sortType };
                break;
            case "وضعیت":
                sort = { "info.status": sortType };
                break;
            default:
                sort = { "info.createdAt": sortType };
                break;
        }

        // the base query object
        let query = {};

        // filters
        if (!!req.query.forUser) {
            let forUser: any = req.query.forUser;
            query["user._id"] = new Types.ObjectId(forUser);
        }

        // making the model with query
        let data = this.UserCourseModel.aggregate();
        data.lookup({ from: "users", localField: "user", foreignField: "_id", as: "user" });
        data.lookup({ from: "courses", localField: "course", foreignField: "_id", as: "course" });
        data.match(query);
        data.project({
            "user.image": 1,
            fullname: { $concat: [{ $arrayElemAt: ["$user.name", 0] }, " ", { $arrayElemAt: ["$user.family", 0] }] },
            "course.image": 1,
            "course.name": 1,
            totalPrice: 1,
            authority: 1,
            paidAmount: 1,
            transactionCode: 1,
            status: 1,
            createdAt: 1,
        });
        data.match({
            $or: [
                { fullname: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "course.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { chargeAmount: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { paidAmount: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { transactionCode: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { status: { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });
        data.group({ _id: "$authority", info: { $push: "$$ROOT" } });
        data.sort(sort);

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
    async getTransaction(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.course-transactions.view"])) throw new ForbiddenException();

        const transaction = await this.UserCourseModel.find({ authority: req.params.id })
            .populate("user", "image name family email mobile")
            .populate("course", "image name")
            .exec();
        if (!transaction) throw new NotFoundException();

        return res.json(transaction);
    }

    @Post("/:id")
    async completeTransaction(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.course-transactions.complete"])) throw new ForbiddenException();

        const data = await this.UserCourseModel.find({ authority: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // update the thing
        await this.UserCourseModel.updateMany({ authority: req.params.id }, { status: "ok" }).exec();

        return res.end();
    }
}
