import { Controller, Get, Post, Req, Res, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BundleDocument } from "src/models/bundles.schema";
import { CourseDocument } from "src/models/courses.schema";
import { DiscountService } from "src/services/discount.service";
import { UserCourseDocument } from "src/models/userCourses.schema";
import { UserRoadmapDocument } from "src/models/userRoadmaps.schema";

@Controller("bundles")
export class BundleController {
    constructor(
        private readonly discountService: DiscountService,
        @InjectModel("Bundle") private readonly BundleModel: Model<BundleDocument>,
        @InjectModel("UserRoadmap") private readonly UserRoadmapModel: Model<UserRoadmapDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
    ) {}

    @Get("/")
    async getBundles(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 30;

        const search = req.query.search ? req.query.search.toString() : "";

        // the base query object
        let query = {};

        // making the model with query
        let data = this.BundleModel.aggregate();
        data.match(query);
        data.match({
            $or: [{ title: { $regex: new RegExp(`.*${search}.*`, "i") } }],
        });
        data.sort({ createdAt: "desc" });
        data.project("_id title giftCodePercent giftCodeDeadline discountPercent courses");

        // paginating
        data = data.facet({
            data: [{ $skip: (page - 1) * pp }, { $limit: pp }],
            total: [{ $group: { _id: null, count: { $sum: 1 } } }],
        });

        // executing query and getting the results
        const results = await data.exec().catch((e) => {
            throw e;
        });
        const total = results[0].total[0] ? results[0].total[0].count : 0;

        for (let i = 0; i < results[0].data.length; i++) {
            const bundle = results[0].data[i];
            bundle.price = 0;

            for (let j = 0; j < bundle.courses.length; j++) {
                const course = await this.CourseModel.findOne({ _id: bundle.courses[j].course })
                    .select("image name teacher price")
                    .populate("teacher", "image name family")
                    .exec();
                bundle.courses[j].course = course;
                bundle.courses[j].course.discountInfo = await this.discountService.courseDiscount(req, course._id);
                bundle.price += bundle.courses[j].course.discountInfo.discountedPrice;
            }

            bundle.discountedPrice = bundle.price - bundle.price * (bundle.discountPercent / 100);
            results[0].data[i] = bundle;
        }

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }

    @Get("/info/:id")
    async getBundleInfo(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const bundleResult: any = await this.BundleModel.findOne({ _id: req.params.id }).exec();
        if (!bundleResult) return res.status(404).end();

        const bundle = bundleResult.toJSON();
        bundle.price = 0;

        for (let i = 0; i < bundle.courses.length; i++) {
            const courseId = bundle.courses[i].course;

            let course: any = await this.CourseModel.findOne({ _id: courseId }).select("image name teacher price").populate("teacher", "image name family").exec();
            course = course.toJSON();
            bundle.courses[i].course = course;
            bundle.courses[i].course.discountInfo = await this.discountService.courseDiscount(req, course._id);

            const hasBeenPurchased = await this.UserCourseModel.exists({ user: req.user.user._id, course: courseId, status: "ok" });
            bundle.courses[i].course.hasBeenPurchased = hasBeenPurchased;

            if (!hasBeenPurchased) {
                bundle.price += bundle.courses[i].course.discountInfo.discountedPrice;
            }
        }
        bundle.discountedPrice = bundle.price - bundle.price * (bundle.discountPercent / 100);

        return res.json(bundle);
    }

    @Post("/activate/:id")
    async activateBundle(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const bundle = await this.BundleModel.findOne({ _id: req.params.id }).exec();
        if (!bundle) return res.status(404).end();

        // TODO
        // check if user had this bundle before and the status is canceled, activate that bundle and re-calc the current course start date

        // check if any bundle is active or not
        const activeRoadmap = await this.UserRoadmapModel.exists({ user: req.user.user._id, status: "active" });
        if (activeRoadmap) throw new UnprocessableEntityException([{ property: "roadmap", errors: ["درحال حاضر شما نقشه راه فعال شده ای دارید!"] }]);

        // check if user finished this bundle or not
        const alreadyFinished = await this.UserRoadmapModel.exists({ user: req.user.user._id, bundle: bundle._id, status: "finished" });
        if (alreadyFinished) throw new UnprocessableEntityException([{ property: "roadmap", errors: ["شما قبلا این مجموعه دوره را گذرانده اید!"] }]);

        // check if user purchased next course or not
        // if user purchased the course then fill the 'currentCourseStartDate'
        const purchased = await this.UserCourseModel.exists({ user: req.user.user._id, course: bundle.courses[0].course, status: "ok" });

        // if no bundle is active then activate the bundle for user
        await this.UserRoadmapModel.create({
            user: req.user.user._id,
            bundle: bundle._id,
            currentCourse: bundle.courses[0].course,
            currentCourseStartDate: purchased ? new Date(Date.now()) : null,
            status: "active",
            startDate: new Date(Date.now()),
        });

        return res.end();
    }
}
