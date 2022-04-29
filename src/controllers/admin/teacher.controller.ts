import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { unlink, readFile } from "fs/promises";
import { hash } from "bcrypt";
import { UserDocument } from "src/models/users.schema";
import { PermissionGroupDocument } from "src/models/permissionGroups.schema";
import { AuthService } from "src/services/auth.service";
import { FilesInterceptor } from "@nestjs/platform-express";
import { randStr } from "src/helpers/str.helper";
import * as sharp from "sharp";
import * as Jmoment from "jalali-moment";
import { CreateNewTeacherDto, UpdateTeacherDto, PayTeacherCommissionDto } from "src/dto/adminPanel/teachers.dto";
import { CommissionPaymentDocument } from "src/models/commissionPayments.schema";
import { UserCourseDocument } from "src/models/userCourses.schema";

@Controller("admin/teachers")
export class TeacherController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("PermissionGroup") private readonly PermissionGroupModel: Model<PermissionGroupDocument>,
        @InjectModel("CommissionPayment") private readonly CommissionPaymentModel: Model<CommissionPaymentDocument>,
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
    ) {}

    @Post("/pay/:id")
    async payCommission(@Body() input: PayTeacherCommissionDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.teachers.pay"])) throw new ForbiddenException();

        if (parseInt(input.amount) <= 0) throw new UnprocessableEntityException([{ property: "amount", errors: ["مبلغ را وارد کنید!"] }]);

        const teacher = await this.UserModel.findOne({ _id: req.params.id, role: "teacher" }).exec();
        if (!teacher) throw new NotFoundException([{ property: "teacher", errors: ["استاد پیدا نشد!"] }]);

        // check if commission balance is equal or less than amount
        if (teacher.commissionBalance < parseInt(input.amount)) {
            throw new UnprocessableEntityException([{ property: "amount", errors: ["مبلغ وارد شده بیشتر از کمیسیون کاربر است!"] }]);
        }

        await this.CommissionPaymentModel.create({
            user: teacher._id,
            commissionAmountBeforePayment: teacher.commissionBalance,
            payedAmount: parseInt(input.amount),
            commissionAmountAfterPayment: teacher.commissionBalance + parseInt(input.amount),
            cardNumber: input.cardNumber || null,
            bank: input.bank || null,
            createdAt: new Date(Date.now()),
        });

        // update teacher's commissionBalance
        await this.UserModel.updateOne({ _id: req.params.id }, { commissionBalance: teacher.commissionBalance - parseInt(input.amount) }).exec();

        return res.end();
    }

    @Get("/commissions/:id")
    async getTeacherCommissionList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.teachers.view"])) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "desc";
        switch (req.query.sort) {
            case "مشتری":
                sort = { "user.name": sortType, "user.family": sortType };
                break;
            case "دوره":
                sort = { "course.name": sortType };
                break;
            case "مبلغ پرداختی کاربر":
                sort = { paidAmount: sortType };
                break;
            case "کمیسیون استاد":
                sort = { teacherCut: sortType };
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
        data.project("user.image user.name user.family course.name teacherCut paidAmount createdAt");
        if (!!search) {
            data.match({
                $or: [
                    { "user.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { "user.family": { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { "course.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { paidAmount: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { teacherCut: { $regex: new RegExp(`.*${search}.*`, "i") } },
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
    async getTeacherCommissionPaymentList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.teachers.view"])) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "desc";
        switch (req.query.sort) {
            case "مبلغ پرداختی کمیسیون":
                sort = { payedAmount: sortType };
                break;
            case "مبلغ مانده کمیسیون":
                sort = { commissionAmountAfterPayment: sortType };
                break;
            case "شماره حساب | شماره کارت":
                sort = { cardNumber: sortType };
                break;
            case "بانک":
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

    // =============================================================================

    @Get("/")
    async getTeacherList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.teachers.view"])) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "desc";
        switch (req.query.sort) {
            case "استاد":
                sort = { name: sortType, family: sortType };
                break;
            case "ایمیل":
                sort = { email: sortType };
                break;
            case "شماره موبایل":
                sort = { mobile: sortType };
                break;
            case "نوع کمیسیون":
                sort = { commission_name: sortType };
                break;
            case "وضعیت":
                sort = { status: sortType };
                break;
            default:
                sort = { createdAt: sortType };
                break;
        }

        // the base query object
        let query = {
            role: "teacher",
        };

        // filters
        // ...

        // making the model with query
        let data = this.UserModel.aggregate();
        data.match(query);
        data.lookup({
            from: "commissions",
            let: { commission_id: "$commission" },
            pipeline: [{ $match: { $expr: { $eq: ["$$commission_id", "$_id"] } } }, { $project: { name: 1 } }],
            as: "commission",
        });
        data.sort(sort);
        data.project({
            _id: 1,
            image: 1,
            name: 1,
            family: 1,
            email: 1,
            mobile: 1,
            commission_name: { $arrayElemAt: ["$commission.name", 0] },
            status: 1,
            createdAt: 1,
        });
        data.match({
            $or: [
                { name: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { family: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { email: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { mobile: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { commission_name: { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });

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
    async getTeacher(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.teachers.view"])) throw new ForbiddenException();

        const teacher = await this.UserModel.findOne({ _id: req.params.id, role: "teacher" }).exec();
        if (!teacher) throw new NotFoundException();
        return res.json(teacher);
    }

    @Post("/")
    @UseInterceptors(FilesInterceptor("files"))
    async addTeacher(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: CreateNewTeacherDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.teachers.add"])) throw new ForbiddenException();

        const isEmailExists = await this.UserModel.exists({ email: input.email });
        if (isEmailExists) {
            throw new UnprocessableEntityException([{ property: "name", errors: ["ایمیل قبلا استفاده شده"] }]);
        }

        const isMobileExists = await this.UserModel.exists({ mobile: input.mobile });
        if (isMobileExists) {
            throw new UnprocessableEntityException([{ property: "name", errors: ["شماره موبایل قبلا استفاده شده"] }]);
        }

        if (input.password !== input.passwordConfirmation) {
            throw new UnprocessableEntityException([{ property: "password", errors: ["رمزعبورها باهم همخوانی ندارند"] }]);
        }

        let imageLink = "";
        if (!!files.length) {
            const ogName = files[0].originalname;
            const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (files[0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["حجم فایل باید کمتر از 2Mb باشد"] }]);
            // check file format
            let isMimeOk = extension == "png" || extension == "gif" || extension == "jpeg" || extension == "jpg";
            if (!isMimeOk) throw new UnprocessableEntityException([{ property: "image", errors: ["فرمت فایل معتبر نیست"] }]);

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
            birthDate: input.birthDate || null,
            fatherName: input.fatherName || "",
            description: input.description || "",
            groups: input.groups.split(","),
            financial: {
                cardNumber: input.cardNumber || "",
                cardOwnerName: input.cardOwnerName || "",
                cardBankName: input.cardBankName || "",
                shebaNumber: input.shebaNumber || "",
            },
            commission: input.commission,
            role: "teacher",
        });

        return res.end();
    }

    @Put("/:id")
    @UseInterceptors(FilesInterceptor("files"))
    async editTeacher(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: UpdateTeacherDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.teachers.edit"])) throw new ForbiddenException();

        const isEmailExists = await this.UserModel.exists({ _id: { $ne: req.params.id }, email: input.email });
        if (isEmailExists) {
            throw new UnprocessableEntityException([{ property: "name", errors: ["ایمیل قبلا استفاده شده"] }]);
        }

        const isMobileExists = await this.UserModel.exists({ _id: { $ne: req.params.id }, mobile: input.mobile });
        if (isMobileExists) {
            throw new UnprocessableEntityException([{ property: "name", errors: ["شماره موبایل قبلا استفاده شده"] }]);
        }

        if (!!input.password && !!input.passwordConfirmation && input.password !== input.passwordConfirmation) {
            throw new UnprocessableEntityException([{ property: "password", errors: ["رمزعبورها باهم همخوانی ندارند"] }]);
        }

        // find teacher
        const teacher = await this.UserModel.findOne({ _id: req.params.id }).exec();
        if (!teacher) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);

        let imageLink = "";
        if (!!files.length) {
            const ogName = files[0].originalname;
            const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (files[0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["حجم فایل باید کمتر از 2Mb باشد"] }]);
            // check file format
            let isMimeOk = extension == "png" || extension == "gif" || extension == "jpeg" || extension == "jpg";
            if (!isMimeOk) throw new UnprocessableEntityException([{ property: "image", errors: ["فرمت فایل معتبر نیست"] }]);

            // delete the old image from system
            await unlink(teacher.image.replace("/file/", "storage/")).catch((e) => {});

            const randName = randStr(10);
            const img = sharp(Buffer.from(files[0].buffer));
            img.resize(256);
            const url = `storage/public/user_avatars/${randName}.${extension}`;
            await img.toFile(url).catch((e) => console.log(e));

            imageLink = url.replace("storage/", "/file/");
        } else if (!!input.image && input.image != "") {
            imageLink = teacher.image;
        }

        let password = teacher.password;
        if (!!input.password && input.password != "") {
            password = await hash(input.password, 5);
        }

        const groups: any = input.groups.split(",");
        const commission: any = input.commission;

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

                birthDate: input.birthDate || "",
                fatherName: input.fatherName || "",
                description: input.description || "",
                groups: groups,
                financial: {
                    cardNumber: input.cardNumber || "",
                    cardOwnerName: input.cardOwnerName || "",
                    cardBankName: input.cardBankName || "",
                    shebaNumber: input.shebaNumber || "",
                },
                commission: commission,
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deleteTeacher(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.teachers.delete"])) throw new ForbiddenException();

        const data = await this.UserModel.findOne({ _id: req.params.id, role: "teacher" }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete the teacher
        await this.UserModel.deleteOne({ _id: req.params.id, role: "teacher" }).exec();

        return res.end();
    }
}
