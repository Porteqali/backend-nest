import { Body, Controller, Delete, Get, Post, Put, Query, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { unlink, writeFile } from "fs/promises";
import { hash } from "bcrypt";
import { UserDocument } from "src/models/users.schema";
import { PermissionGroupDocument } from "src/models/permissionGroups.schema";
import { AuthService } from "src/services/auth.service";
import { FilesInterceptor } from "@nestjs/platform-express";
import { randStr } from "src/helpers/str.helper";
import * as sharp from "sharp";
import * as Jmoment from "jalali-moment";
import * as json2xls from "json2xls";
import { ExportUserDto, UpdateUserDto } from "src/dto/adminPanel/users.dto";
import { UserCourseDocument } from "src/models/userCourses.schema";

@Controller("admin/users")
export class UserController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("PermissionGroup") private readonly PermissionGroupModel: Model<PermissionGroupDocument>,
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
    ) {}

    @Get("/export")
    async exportUser(@Query() input: ExportUserDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const users = this.UserModel.aggregate();
        // users.match({ role: "user" });
        if (!!input.startDate && !!input.endDate) {
            const startDate = Jmoment.from(input.startDate, "fa").toDate();
            const endDate = Jmoment.from(input.endDate, "fa").toDate();
            users.match({ createdAt: { $gte: startDate, $lte: endDate } });
        }
        if (typeof input.selectedCourses != "undefined" && input.selectedCourses !== null) {
            const selectedCourses = input.selectedCourses != "" ? input.selectedCourses.split(",").map((id) => new Types.ObjectId(id)) : [];
            users.lookup({
                from: "usercourses",
                let: { user_id: "$_id" },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ["$$user_id", "$user"] }, { $in: ["$course", selectedCourses] }, { $eq: ["$status", "ok"] }] } } },
                    { $project: { count: { $sum: 1 } } },
                ],
                as: "userCourse",
            });
            users.match({ "userCourse.count": { $gt: 0 } });
        }
        const project: any = { _id: 0, نام: "$name", "نام خانوادگی": "$family" };
        if (input.emailField == "true") project.ایمیل = "$email";
        if (input.mobileField == "true") project.موبایل = "$mobile";
        users.project(project);

        let error = false;
        const results = await users.exec().catch((e) => (error = true));
        if (error) throw new InternalServerErrorException();

        const xls = json2xls(results);
        await writeFile("./storage/private/user_export.xlsx", xls, "binary").catch((e) => {});

        return res.json({ link: `file/private/user_export.xlsx` });
    }

    @Get("/courses/:id")
    async getUserCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.users.view"]))) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "asc";
        switch (req.query.sort) {
            case "دوره":
                sort = { "course.name": sortType };
                break;
            case "کد تراکنش":
                sort = { transactionCode: sortType };
                break;
            case "مقدار پرداختی":
                sort = { paidAmount: sortType };
                break;
            case "تاریخ خرید":
                sort = { createdAt: sortType };
                break;
        }

        // the base query object
        let query = {
            user: new Types.ObjectId(req.params.id),
            status: "ok",
        };

        // filters
        // ...

        // making the model with query
        let data = this.UserCourseModel.aggregate();
        data.match(query);
        data.lookup({
            from: "courses",
            localField: "course",
            foreignField: "_id",
            as: "course",
        });
        data.sort(sort);
        data.project("course.image course.name paidAmount transactionCode createdAt");
        if (!!search) {
            data.match({
                $or: [
                    { "course.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { paidAmount: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { transactionCode: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { createdAt: { $regex: new RegExp(`.*${search}.*`, "i") } },
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

    @Post("/courses/:id")
    async addCoursesToUser(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        let selectedCourses = req.body.selectedCourses;
        if (!selectedCourses) throw new UnprocessableEntityException([{ property: "selectedCourses", errors: ["دوره ای انتخاب نشده"] }]);

        selectedCourses = selectedCourses.split(",");
        const userId: any = new Types.ObjectId(req.params.id);
        const purchasedCourses = await this.UserCourseModel.find({ user: userId, course: { $in: selectedCourses }, status: "ok" }).exec();

        for (let i = 0; i < purchasedCourses.length; i++) {
            const courseId = purchasedCourses[i].course.toString();
            if (selectedCourses.indexOf(courseId) > -1) {
                selectedCourses.splice(selectedCourses.indexOf(courseId), 1);
            }
        }

        for (let i = 0; i < selectedCourses.length; i++) {
            await this.UserCourseModel.create({
                user: req.params.id,
                course: selectedCourses[i],
                coursePrice: 0,
                coursePayablePrice: 0,
                totalPrice: 0,
                paidAmount: 0,
                transactionCode: "---",
                authority: randStr(20),
                paymentMethod: "admin-added",
                status: "ok",
            });
        }

        return res.end();
    }

    // =============================================================================

    @Get("/")
    async getUsersList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.users.view"]))) throw new ForbiddenException();

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
            case "ایمیل":
                sort = { email: sortType };
                break;
            case "شماره موبایل":
                sort = { mobile: sortType };
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
            role: "user",
        };

        // filters
        // ...

        // making the model with query
        let data = this.UserModel.aggregate();
        data.match(query);
        data.lookup({
            from: "permissiongroups",
            localField: "permissionGroup",
            foreignField: "_id",
            as: "permission_group",
        });
        data.sort(sort);
        data.project({
            image: 1,
            fullname: { $concat: ["$name", " ", "$family"] },
            email: 1,
            mobile: 1,
            emailVerifiedAt: 1,
            mobileVerifiedAt: 1,
            status: 1,
            createdAt: 1,
        });
        data.match({
            $or: [
                { fullname: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { email: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { mobile: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { status: { $regex: new RegExp(`.*${search}.*`, "i") } },
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
    async getUser(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.users.view"]))) throw new ForbiddenException();

        const user = await this.UserModel.findOne({ _id: req.params.id }).exec();
        if (!user) throw new NotFoundException();
        return res.json(user);
    }

    @Put("/:id")
    @UseInterceptors(FilesInterceptor("files"))
    async editUser(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: UpdateUserDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.users.edit"]))) throw new ForbiddenException();

        const isEmailExists = await this.UserModel.exists({ _id: { $ne: req.params.id }, email: input.email });
        if (isEmailExists) {
            throw new UnprocessableEntityException([{ property: "email", errors: ["ایمیل قبلا استفاده شده"] }]);
        }

        const isMobileExists = await this.UserModel.exists({ _id: { $ne: req.params.id }, mobile: input.mobile });
        if (isMobileExists) {
            throw new UnprocessableEntityException([{ property: "mobile", errors: ["شماره موبایل قبلا استفاده شده"] }]);
        }

        if (!!input.password && !!input.passwordConfirmation && input.password !== input.passwordConfirmation) {
            throw new UnprocessableEntityException([{ property: "password", errors: ["رمزعبورها باهم همخوانی ندارند"] }]);
        }

        // find user
        const user = await this.UserModel.findOne({ _id: req.params.id }).exec();
        if (!user) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);

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
            if (!!user.image) await unlink(user.image.replace("/file/", "storage/")).catch((e) => {});

            const randName = randStr(10);
            const img = sharp(Buffer.from(files[0].buffer));
            img.resize(256);
            const url = `storage/public/user_avatars/${randName}.${extension}`;
            await img.toFile(url).catch((e) => console.log(e));

            imageLink = url.replace("storage/", "/file/");
        } else if (!!input.image && input.image != "") {
            imageLink = user.image;
        }

        let password = user.password;
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
                emailVerifiedAt: input.emailVerified == "true" ? new Date(Date.now()) : null,
                mobile: input.mobile,
                mobileVerifiedAt: input.mobileVerified == "true" ? new Date(Date.now()) : null,
                password: password,
                status: input.status,
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deleteUser(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.users.delete"]))) throw new ForbiddenException();

        const data = await this.UserModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete the user
        await this.UserModel.deleteOne({ _id: req.params.id, role: "user" }).exec();

        return res.end();
    }
}
