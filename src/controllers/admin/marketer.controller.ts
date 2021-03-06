import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Schema, Types } from "mongoose";
import { unlink, readFile } from "fs/promises";
import { hash } from "bcrypt";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { FilesInterceptor } from "@nestjs/platform-express";
import { randStr } from "src/helpers/str.helper";
import * as sharp from "sharp";
import * as Jmoment from "jalali-moment";
import { CreateNewMarketerDto, PayMarketerCommissionDto, UpdateMarketerDto } from "src/dto/adminPanel/marketers.dto";
import { CommissionPaymentDocument } from "src/models/commissionPayments.schema";
import { UserCourseDocument } from "src/models/userCourses.schema";
import { MarketerCoursesDocument } from "src/models/marketerCourses.schema";
import { CourseDocument } from "src/models/courses.schema";
import { CourseGroupDocument } from "src/models/courseGroups.schema";

@Controller("admin/marketers")
export class MarketerController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("CommissionPayment") private readonly CommissionPaymentModel: Model<CommissionPaymentDocument>,
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("CourseGroup") private readonly CourseGroupModel: Model<CourseGroupDocument>,
        @InjectModel("MarketerCourse") private readonly MarketerCourseModel: Model<MarketerCoursesDocument>,
    ) {}

    @Post("/pay/:id")
    async payCommission(@Body() input: PayMarketerCommissionDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.marketers.pay"]))) throw new ForbiddenException();

        if (parseInt(input.amount) <= 0) throw new UnprocessableEntityException([{ property: "amount", errors: ["???????? ???? ???????? ????????!"] }]);

        const marketer = await this.UserModel.findOne({ _id: req.params.id, role: "marketer" }).exec();
        if (!marketer) throw new NotFoundException([{ property: "marketer", errors: ["???????????????? ???????? ??????!"] }]);

        // check if commission balance is equal or less than amount
        if (marketer.commissionBalance < parseInt(input.amount)) {
            throw new UnprocessableEntityException([{ property: "amount", errors: ["???????? ???????? ?????? ?????????? ???? ?????????????? ?????????? ??????!"] }]);
        }

        await this.CommissionPaymentModel.create({
            user: marketer._id,
            commissionAmountBeforePayment: marketer.commissionBalance,
            payedAmount: parseInt(input.amount),
            commissionAmountAfterPayment: marketer.commissionBalance + parseInt(input.amount),
            cardNumber: input.cardNumber || null,
            bank: input.bank || null,
            createdAt: new Date(Date.now()),
        });

        // update marketer's commissionBalance
        await this.UserModel.updateOne({ _id: req.params.id }, { commissionBalance: marketer.commissionBalance - parseInt(input.amount) }).exec();

        return res.end();
    }

    @Get("/customers/:id")
    async getMarketerCustomerList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.marketers.view"]))) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "desc";
        switch (req.query.sort) {
            case "??????????":
                sort = { fullname: sortType };
                break;
            case "???????? ?????? ??????":
                sort = { createdAt: sortType };
                break;
            case "????????":
                sort = { period: sortType };
                break;
            case "???????? ?????????? ????????":
                sort = { endsAt: sortType };
                break;
        }

        // the base query object
        let query = {
            "registeredWith.marketer": new Types.ObjectId(req.params.id),
        };

        // filters
        // ...

        // making the model with query
        let data = this.UserModel.aggregate();
        data.match(query);
        data.sort(sort);
        data.project({
            image: 1,
            fullname: { $concat: ["$name", " ", "$family"] },
            period: "$registeredWith.period",
            endsAt: "$registeredWith.endsAt",
            createdAt: 1,
        });
        if (!!search) {
            data.match({
                $or: [
                    { fullname: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { period: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { endsAt: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { email: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { mobile: { $regex: new RegExp(`.*${search}.*`, "i") } },
                ],
            });
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

        // transform data
        results[0].data.map((row) => {
            row.tillTheEnd = Jmoment(row.endsAt).locale("fa").fromNow();
            return row;
        });

        // get the user
        const user = await this.UserModel.findOne({ _id: req.params.id }).exec();

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
            user: {
                image: user.image,
                name: user.name,
                family: user.family,
                email: user.email,
            },
        });
    }

    @Get("/commissions/:id")
    async getMarketerCommissionList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.marketers.view"]))) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "desc";
        switch (req.query.sort) {
            case "??????????":
                sort = { "user.name": sortType, "user.family": sortType };
                break;
            case "????????":
                sort = { "course.name": sortType };
                break;
            case "???????? ?????????????? ??????????":
                sort = { paidAmount: sortType };
                break;
            case "?????????????? ????????????????":
                sort = { marketerCut: sortType };
                break;
            default:
                sort = { createdAt: sortType };
                break;
        }

        // the base query object
        let query = {
            marketer: new Types.ObjectId(req.params.id),
        };

        // filters
        // ...

        // making the model with query
        let data = this.UserCourseModel.aggregate();
        data.match(query);
        data.lookup({
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
        });
        data.lookup({
            from: "courses",
            localField: "course",
            foreignField: "_id",
            as: "course",
        });
        data.sort(sort);
        data.project("user.image user.name user.family course.name marketerCut paidAmount createdAt");
        if (!!search) {
            data.match({
                $or: [
                    { "user.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { "user.family": { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { "course.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { paidAmount: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { marketerCut: { $regex: new RegExp(`.*${search}.*`, "i") } },
                ],
            });
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

        // get the user
        const user = await this.UserModel.findOne({ _id: req.params.id }).exec();

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
            user: {
                image: user.image,
                name: user.name,
                family: user.family,
                email: user.email,
            },
        });
    }

    @Get("/commission-payments/:id")
    async getMarketerCommissionPaymentList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.marketers.view"]))) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "desc";
        switch (req.query.sort) {
            case "???????? ?????????????? ??????????????":
                sort = { payedAmount: sortType };
                break;
            case "???????? ?????????? ??????????????":
                sort = { commissionAmountAfterPayment: sortType };
                break;
            case "?????????? ???????? | ?????????? ????????":
                sort = { cardNumber: sortType };
                break;
            case "????????":
                sort = { bank: sortType };
                break;
            default:
                sort = { createdAt: sortType };
                break;
        }

        // the base query object
        let query = {
            user: new Types.ObjectId(req.params.id),
        };

        // filters
        // ...

        // making the model with query
        let data = this.CommissionPaymentModel.aggregate();
        data.match(query);
        data.sort(sort);
        data.project("commissionAmountBeforePayment payedAmount commissionAmountAfterPayment cardNumber bank createdAt");
        if (!!search) {
            data.match({
                $or: [
                    { commissionAmountBeforePayment: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { payedAmount: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { commissionAmountAfterPayment: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { cardNumber: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { bank: { $regex: new RegExp(`.*${search}.*`, "i") } },
                ],
            });
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

        // get the user
        const user = await this.UserModel.findOne({ _id: req.params.id }).exec();

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
            user: {
                image: user.image,
                name: user.name,
                family: user.family,
                email: user.email,
            },
        });
    }

    @Get("/courses/:id")
    async getMarketerCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.marketers.view"]))) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // the base query object
        let query = {
            marketer: new Types.ObjectId(req.params.id),
        };

        // making the model with query
        let data = this.MarketerCourseModel.aggregate();
        data.match(query);
        data.lookup({
            from: "courses",
            localField: "course",
            foreignField: "_id",
            as: "course",
        });
        data.sort({ createdAt: "desc" });
        data.project("course.image course.name commissionAmount commissionType code status createdAt");
        if (!!search) {
            data.match({
                $or: [
                    { commissionAmount: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { commissionType: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { code: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { status: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { "course.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                ],
            });
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

        // get the user
        const user = await this.UserModel.findOne({ _id: req.params.id }).exec();

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
            user: { image: user.image, name: user.name, family: user.family, email: user.email },
        });
    }

    @Post("/courses-bulk/:id")
    async bulkAddCoursesToMarketer(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.marketers.edit"]))) throw new ForbiddenException();

        const bulkAmountType = req.body.bulkAmountType;
        const bulkAmount = req.body.bulkAmount ? parseInt(req.body.bulkAmount) : 0;
        const emmitTo = req.body.emmitTo;
        const emmitToId = req.body.emmitToId;
        const marketerId: any = new Types.ObjectId(req.params.id);

        if (emmitTo !== "allCourses" && !emmitToId) {
            throw new UnprocessableEntityException([{ property: "emmitToId", errors: ["???????? ???? ???????? ???????? ???????? ?????? ???? ???????? ????????"] }]);
        }

        const marketer = await this.UserModel.findOne({ _id: req.params.id, role: "marketer" });

        let arrayToInsert = [];
        switch (emmitTo) {
            case "allCourses":
                const courses = await this.CourseModel.find().select("_id").exec();
                for (let i = 0; i < courses.length; i++) {
                    arrayToInsert.push({
                        marketer: req.params.id,
                        course: courses[i]._id,
                        commissionAmount: bulkAmount,
                        commissionType: bulkAmountType,
                        code: marketer.marketingCode,
                    });
                }
                break;
            case "course":
                const course = await this.CourseModel.findOne({ _id: emmitToId }).select("_id").exec();
                arrayToInsert.push({
                    marketer: req.params.id,
                    course: course._id,
                    commissionAmount: bulkAmount,
                    commissionType: bulkAmountType,
                    code: marketer.marketingCode,
                });
                break;
            case "courseGroup":
                const groupCourses = await this.CourseModel.find({ groups: { $elemMatch: { $eq: emmitToId } } })
                    .select("_id")
                    .exec();
                for (let i = 0; i < groupCourses.length; i++) {
                    arrayToInsert.push({
                        marketer: req.params.id,
                        course: groupCourses[i]._id,
                        commissionAmount: bulkAmount,
                        commissionType: bulkAmountType,
                        code: marketer.marketingCode,
                    });
                }
                break;
        }

        for (let i = 0; i < arrayToInsert.length; i++) {
            await this.MarketerCourseModel.updateOne({ marketer: marketerId, course: arrayToInsert[i].course }, { ...arrayToInsert[i] }, { upsert: true }).exec();
        }
        return res.end();
    }

    @Delete("/courses-bulk/:id")
    async bulkDeleteCoursesFromMarketer(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.marketers.edit"]))) throw new ForbiddenException();

        const emmitTo = req.query.emmitTo;
        const emmitToId = req.query.emmitToId;
        const marketerId: any = new Types.ObjectId(req.params.id);

        if (emmitTo !== "allCourses" && !emmitToId) {
            throw new UnprocessableEntityException([{ property: "emmitToId", errors: ["???????? ???? ???????? ???????? ???????? ?????? ???? ???????? ????????"] }]);
        }

        let arrayToDelete = [];
        switch (emmitTo) {
            case "allCourses":
                const courses = await this.CourseModel.find().select("_id").exec();
                for (let i = 0; i < courses.length; i++) arrayToDelete.push(courses[i]._id);
                break;
            case "course":
                const course = await this.CourseModel.findOne({ _id: emmitToId }).select("_id").exec();
                arrayToDelete.push(course._id);
                break;
            case "courseGroup":
                const groupCourses = await this.CourseModel.find({ groups: { $elemMatch: { $eq: emmitToId } } })
                    .select("_id")
                    .exec();
                for (let i = 0; i < groupCourses.length; i++) arrayToDelete.push(groupCourses[i]._id);
                break;
        }

        await this.MarketerCourseModel.deleteMany({ marketer: marketerId, course: { $in: arrayToDelete } }).exec();
        return res.end();
    }

    @Put("/courses/:id")
    async editMarketerCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.marketers.edit"]))) throw new ForbiddenException();

        const coursesToDelete = req.body.coursesToDelete || [];
        for (let i = 0; i < coursesToDelete.length; i++) {
            await this.MarketerCourseModel.deleteOne({ _id: coursesToDelete[i] });
        }

        const courses = req.body.courses || [];
        for (let i = 0; i < courses.length; i++) {
            await this.MarketerCourseModel.updateOne(
                { _id: courses[i]._id },
                {
                    commissionAmount: courses[i].commissionAmount || 0,
                    commissionType: courses[i].commissionType,
                    status: courses[i].status,
                },
            );
        }

        return res.end();
    }

    // =============================================================================

    @Get("/")
    async getMarketerList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.marketers.view"]))) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "desc";
        switch (req.query.sort) {
            case "????????????????":
                sort = { name: sortType, family: sortType };
                break;
            case "?????????? ??????????????":
                sort = { customerCount: sortType };
                break;
            case "???? ??????????????":
                sort = { totalCommission: sortType };
                break;
            case "?????????????? ???????????? ??????":
                sort = { totalPaid: sortType };
                break;
            case "??????????":
                sort = { status: sortType };
                break;
            default:
                sort = { createdAt: sortType };
                break;
        }

        // the base query object
        let query = {
            role: "marketer",
        };

        // filters
        // ...

        // making the model with query
        let data = this.UserModel.aggregate();
        data.match(query);
        data.lookup({
            from: "usercourses",
            let: { user_id: "$_id" },
            pipeline: [
                {
                    $match: { $expr: { $eq: ["$$user_id", "$marketer"] } },
                },
                { $group: { _id: "$user" } },
            ],
            as: "userCount",
        });
        data.lookup({
            from: "commissionpayments",
            let: { user_id: "$_id", commissionBalance: "$commissionBalance" },
            pipeline: [
                {
                    $match: { $expr: { $eq: ["$$user_id", "$user"] } },
                },
                { $project: { totalPaid: { $sum: "$payedAmount" } } },
            ],
            as: "commissionPayments",
        });
        data.match({
            $or: [
                { name: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { family: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { email: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { marketingUrlCode: { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });
        data.sort(sort);
        data.project({
            _id: 1,
            image: 1,
            name: 1,
            family: 1,
            email: 1,
            status: 1,
            createdAt: 1,
            customerCount: { $size: "$userCount" },
            totalPaid: { $sum: "$commissionPayments.totalPaid" },
            // totalCommission: { $sum: "$commissionPayments.totalCommission" },
            totalCommission: { $add: [{ $sum: "$commissionPayments.totalPaid" }, "$commissionBalance"] },
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
    async getMarketer(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.marketers.view"]))) throw new ForbiddenException();

        const marketer = await this.UserModel.findOne({ _id: req.params.id, role: "marketer" }).exec();
        if (!marketer) throw new NotFoundException();
        return res.json(marketer);
    }

    @Post("/")
    @UseInterceptors(FilesInterceptor("files"))
    async addMarketer(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: CreateNewMarketerDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.marketers.add"]))) throw new ForbiddenException();

        const isEmailExists = await this.UserModel.exists({ email: input.email });
        if (isEmailExists) {
            throw new UnprocessableEntityException([{ property: "name", errors: ["?????????? ???????? ?????????????? ??????"] }]);
        }

        if (typeof input.mobile !== "undefined") {
            const isMobileExists = await this.UserModel.exists({ mobile: input.mobile });
            if (isMobileExists) {
                throw new UnprocessableEntityException([{ property: "name", errors: ["?????????? ???????????? ???????? ?????????????? ??????"] }]);
            }
        }

        const isMarketingCodeExists = await this.UserModel.exists({ marketingCode: input.marketingCode });
        if (isMarketingCodeExists) {
            throw new UnprocessableEntityException([{ property: "name", errors: ["???? ?????????????????? ???????? ?????????????? ??????"] }]);
        }

        if (input.password !== input.passwordConfirmation) {
            throw new UnprocessableEntityException([{ property: "password", errors: ["?????????????????? ???????? ?????????????? ????????????"] }]);
        }

        let imageLink = "";
        if (!!files.length) {
            const ogName = files[0].originalname;
            const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (files[0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["?????? ???????? ???????? ???????? ???? 2Mb ????????"] }]);
            // check file format
            let isMimeOk = extension == "png" || extension == "gif" || extension == "jpeg" || extension == "jpg";
            if (!isMimeOk) throw new UnprocessableEntityException([{ property: "image", errors: ["???????? ???????? ?????????? ????????"] }]);

            const randName = randStr(10);
            const img = sharp(Buffer.from(files[0].buffer));
            img.resize(256);
            const url = `storage/public/user_avatars/${randName}.${extension}`;
            await img.toFile(url).catch((e) => console.log(e));

            imageLink = url.replace("storage/", "/file/");
        }

        await this.UserModel.create({
            image: imageLink,
            name: input.name,
            family: input.family,
            email: input.email,
            password: await hash(input.password, 5),
            status: input.status,
            mobile: input.mobile,
            tel: input.tel || null,
            address: input.address || null,
            postalCode: input.postalCode || null,
            nationalCode: input.nationalCode || null,
            period: input.period,
            marketingCode: input.marketingCode,
            role: "marketer",
        });

        return res.end();
    }

    @Put("/:id")
    @UseInterceptors(FilesInterceptor("files"))
    async editMarketer(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: UpdateMarketerDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.marketers.edit"]))) throw new ForbiddenException();

        const isEmailExists = await this.UserModel.exists({ _id: { $ne: req.params.id }, email: input.email });
        if (isEmailExists) {
            throw new UnprocessableEntityException([{ property: "name", errors: ["?????????? ???????? ?????????????? ??????"] }]);
        }

        if (typeof input.mobile !== "undefined") {
            const isMobileExists = await this.UserModel.exists({ _id: { $ne: req.params.id }, mobile: input.mobile });
            if (isMobileExists) {
                throw new UnprocessableEntityException([{ property: "name", errors: ["?????????? ???????????? ???????? ?????????????? ??????"] }]);
            }
        }

        const isMarketingCodeExists = await this.UserModel.exists({ _id: { $ne: req.params.id }, marketingCode: input.marketingCode });
        if (isMarketingCodeExists) {
            throw new UnprocessableEntityException([{ property: "name", errors: ["???? ?????????????????? ???????? ?????????????? ??????"] }]);
        }

        if (!!input.password && !!input.passwordConfirmation && input.password !== input.passwordConfirmation) {
            throw new UnprocessableEntityException([{ property: "password", errors: ["?????????????????? ???????? ?????????????? ????????????"] }]);
        }

        // find marketer
        const marketer = await this.UserModel.findOne({ _id: req.params.id }).exec();
        if (!marketer) throw new NotFoundException([{ property: "record", errors: ["???????????? ???????? ???????????? ???????? ??????"] }]);

        let imageLink = "";
        if (!!files.length) {
            const ogName = files[0].originalname;
            const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (files[0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["?????? ???????? ???????? ???????? ???? 2Mb ????????"] }]);
            // check file format
            let isMimeOk = extension == "png" || extension == "gif" || extension == "jpeg" || extension == "jpg";
            if (!isMimeOk) throw new UnprocessableEntityException([{ property: "image", errors: ["???????? ???????? ?????????? ????????"] }]);

            // delete the old image from system
            if (!!marketer.image) await unlink(marketer.image.replace("/file/", "storage/")).catch((e) => {});

            const randName = randStr(10);
            const img = sharp(Buffer.from(files[0].buffer));
            img.resize(256);
            const url = `storage/public/user_avatars/${randName}.${extension}`;
            await img.toFile(url).catch((e) => console.log(e));

            imageLink = url.replace("storage/", "/file/");
        } else if (!!input.image && input.image != "") {
            imageLink = marketer.image;
        }

        let password = marketer.password;
        if (!!input.password && input.password != "") {
            password = await hash(input.password, 5);
        }

        await this.UserModel.updateOne(
            { _id: req.params.id },
            {
                image: imageLink,
                name: input.name,
                family: input.family,
                email: input.email,
                password: password,
                status: input.status,
                mobile: input.mobile,
                tel: input.tel || null,
                address: input.address || null,
                postalCode: parseInt(input.postalCode) || null,
                nationalCode: parseInt(input.nationalCode) || null,
                period: parseInt(input.period),
                marketingCode: input.marketingCode,
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deleteMarketer(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.marketers.delete"]))) throw new ForbiddenException();

        const data = await this.UserModel.findOne({ _id: req.params.id, role: "marketer" }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["?????????? ???????? ??????!"] }]);

        // delete the marketer
        await this.UserModel.deleteOne({ _id: req.params.id, role: "marketer" }).exec();

        return res.end();
    }
}
