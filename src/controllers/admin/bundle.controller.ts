import { Body, Controller, Delete, Get, Post, Put, Query, Req, Res } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import * as Jmoment from "jalali-moment";
import { BundleDocument } from "src/models/bundles.schema";
import { CreateNewBundleDto, UpdateBundleDto } from "src/dto/adminPanel/bundles.dto";

@Controller("admin/bundles")
export class BundleController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Bundle") private readonly BundleModel: Model<BundleDocument>,
    ) {}

    @Get("/courses/:id")
    async getBundleCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.bundles.view"]))) throw new ForbiddenException();

        const bundleResult = await this.BundleModel.findOne({ _id: req.params.id }).populate("courses.course").exec();
        if (!bundleResult) throw new NotFoundException();
        const bundle: any = bundleResult.toJSON();

        return res.json({ courses: bundle.courses, bundle: bundle });
    }

    @Put("/courses/:id")
    async editBundleCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.bundles.edit"]))) throw new ForbiddenException();

        // find bundle
        const bundleResult = await this.BundleModel.findOne({ _id: req.params.id }).exec();
        if (!bundleResult) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);
        const bundle: any = bundleResult.toJSON();

        const courses = req.body.courses ? req.body.courses : [];
        let topics = [];

        for (let i = 0; i < courses.length; i++) {
            topics.push({
                order: courses[i].order,
                course: courses[i].course._id,
                minimumTimeNeeded: courses[i].minimumTimeNeeded,
            });
        }

        await this.BundleModel.updateOne({ _id: req.params.id }, { courses: topics }).exec();
        return res.end();
    }

    // =============================================================================

    @Get("/")
    async getBundles(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.bundles.view"]))) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "desc";
        switch (req.query.sort) {
            case "عنوان":
                sort = { title: sortType };
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
        let data = this.BundleModel.aggregate();
        data.match(query);
        data.sort(sort);
        data.project("title giftCodePercent giftCodeDeadline discountPercent createdAt");
        data.match({
            $or: [{ title: { $regex: new RegExp(`.*${search}.*`, "i") } }],
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
    async getBundle(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.bundles.view"]))) throw new ForbiddenException();

        const bundle = await this.BundleModel.findOne({ _id: req.params.id }).populate("courses.course", "image name").exec();
        if (!bundle) throw new NotFoundException();
        return res.json(bundle);
    }

    @Post("/")
    async addBundle(@Body() input: CreateNewBundleDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.bundles.add"]))) throw new ForbiddenException();

        await this.BundleModel.create({
            title: input.title,
            giftCodePercent: input.giftCodePercent,
            giftCodeDeadline: input.giftCodeDeadline,
            discountPercent: input.discountPercent,
        });

        return res.end();
    }

    @Put("/:id")
    async editBundle(@Body() input: UpdateBundleDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.bundles.edit"]))) throw new ForbiddenException();

        // find bundle
        const bundleResult = await this.BundleModel.findOne({ _id: req.params.id }).exec();
        if (!bundleResult) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);
        const bundle = bundleResult.toJSON();

        await this.BundleModel.updateOne(
            { _id: req.params.id },
            {
                title: input.title,
                giftCodePercent: input.giftCodePercent,
                giftCodeDeadline: input.giftCodeDeadline,
                discountPercent: input.discountPercent,
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deleteBundle(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.bundles.delete"]))) throw new ForbiddenException();

        const bundle = await this.BundleModel.findOne({ _id: req.params.id }).exec();
        if (!bundle) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete the bundle
        await this.BundleModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
