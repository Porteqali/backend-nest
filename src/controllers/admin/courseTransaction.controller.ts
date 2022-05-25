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
import { CourseDocument } from "src/models/courses.schema";
import { CartService } from "src/services/cart.service";

@Controller("admin/course-transactions")
export class CourseTransactionController {
    constructor(
        private readonly authService: AuthService,
        private readonly cartService: CartService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("PermissionGroup") private readonly PermissionGroupModel: Model<PermissionGroupDocument>,
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
    ) {}

    // =============================================================================

    @Get("/")
    async getTransactions(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.course-transactions.view"]))) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "desc";
        switch (req.query.sort) {
            case "کاربر":
                sort = { "info.userFullname": sortType };
                break;
            case "دوره":
                sort = { "info.courseName": sortType };
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
            query["user"] = new Types.ObjectId(forUser);
        }

        // making the model with query
        let data = this.UserCourseModel.aggregate();
        data.match(query);
        data.project({ userFullname: 1, courseName: 1, totalPrice: 1, authority: 1, paidAmount: 1, transactionCode: 1, status: 1, createdAt: 1 });
        data.match({
            $or: [
                { userFullname: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { courseName: { $regex: new RegExp(`.*${search}.*`, "i") } },
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
        data.allowDiskUse(true);

        // executing query and getting the results
        let error = false;
        const results = await data.exec().catch((e) => {
            error = true;
            console.log(e);
        });
        if (error) throw new InternalServerErrorException();
        const total = results[0].total[0] ? results[0].total[0].count : 0;

        // transform data
        for (let i = 0; i < results[0].data.length; i++) {
            const user = await this.UserModel.findOne({ _id: results[0].data[i].user }).exec();
            results[0].data[i].userImage = !!user ? user.image : "";

            // const course = await this.CourseModel.findOne({ _id: results[0].data[i].course }).exec();
            // results[0].data[i].courseImage = !!course ? course.image : "";
        }

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }

    @Get("/:id")
    async getTransaction(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.course-transactions.view"]))) throw new ForbiddenException();

        const transaction = await this.UserCourseModel.find({ authority: req.params.id })
            .populate("user", "image name family email mobile")
            .populate("course", "image name")
            .exec();
        if (!transaction) throw new NotFoundException();

        return res.json(transaction);
    }

    @Post("/:id")
    async completeTransaction(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.course-transactions.complete"]))) throw new ForbiddenException();

        const data = await this.UserCourseModel.find({ authority: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // check if this course is the same as user's active roadmap current course or not
        // if so then start the counter for the course in roadmap
        const user = data[0].user;
        for (let i = 0; i < data.length; i++) await this.cartService.activateInRoadmap(user, data[i].course);

        // update the thing
        await this.UserCourseModel.updateMany({ authority: req.params.id }, { status: "ok" }).exec();

        return res.end();
    }
}
