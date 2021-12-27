import { Body, Controller, Get, Post, Req, Res, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import * as Jmoment from "jalali-moment";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { SendCommentDto } from "src/dto/sendComment.dto";
import { CommentDocument } from "src/models/comments.schema";
import { TestimonialDocument } from "src/models/testimonials.schema";

@Controller("testimonials")
export class TestimonialsController {
    constructor(@InjectModel("Testimonial") private readonly TestimonialModel: Model<TestimonialDocument>) {}

    @Get("/")
    async getTestimonials(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 10;

        const showFor = !!req.query.showFor ? req.query.showFor.toString() : "";
        if (!showFor) throw new UnprocessableEntityException([{ property: "", errors: ["امکان نمایش نظر وجود ندارد"] }]);

        // the base query object
        let query = {
            showAs: showFor,
        };

        // making the model with query
        let data = this.TestimonialModel.aggregate();
        data.match(query);
        data.sort({ createdAt: "desc" });
        data.project("image fullname title comment");

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
}
