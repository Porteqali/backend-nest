import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { MajorDocument } from "src/models/majors.schema";
import { BundleDocument } from "src/models/bundles.schema";
import { DiscountService } from "src/services/discount.service";
import { CourseDocument } from "src/models/courses.schema";

@Controller("majors")
export class MajorsController {
    constructor(
        private readonly discountService: DiscountService,
        @InjectModel("Major") private readonly MajorModel: Model<MajorDocument>,
        @InjectModel("Bundle") private readonly BundleModel: Model<BundleDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
    ) {}

    @Get("/")
    async getMajors(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 8;

        const search = req.query.search ? req.query.search.toString() : "";

        // the base query object
        let query = {};

        // making the model with query
        let data = this.MajorModel.aggregate();
        data.match(query);
        data.match({
            $or: [{ title: { $regex: new RegExp(`.*${search}.*`, "i") } }],
        });
        data.sort({ createdAt: "desc" });
        data.project("image slug title desc");

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

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }

    @Get("/:slug")
    async getSingleMajor(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const majorResult = await this.MajorModel.findOne({ slug: req.params.slug }).exec();
        if (!majorResult) return res.status(404).end();
        const major: any = majorResult.toJSON();

        major.metadata.url = `${process.env.FRONT_URL}/major/${major.slug}`;

        return res.json({ major });
    }

    @Get("/bundles/:slug")
    async getSingleMajorBundles(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const major = await this.MajorModel.findOne({ slug: req.params.slug }).select("bundles").exec();
        if (!major) return res.status(404).end();

        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 30;

        // const search = req.query.search ? req.query.search.toString() : "";

        // the base query object
        let query = {
            _id: { $in: major.bundles },
        };

        // making the model with query
        let data = this.BundleModel.aggregate();
        data.match(query);
        // data.match({
        //     $or: [{ title: { $regex: new RegExp(`.*${search}.*`, "i") } }],
        // });
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
                let course: any = await this.CourseModel.findOne({ _id: bundle.courses[j].course })
                    .select("image name teacher price")
                    .populate("teacher", "image name family")
                    .exec();
                course = course.toJSON();
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
}
