import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { FaqDocument } from "src/models/faqs.schema";

@Controller("faqs")
export class FaqsController {
    constructor(@InjectModel("Faqs") private readonly FaqsModel: Model<FaqDocument>) {}

    @Get("/")
    async getFaqs(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 50;

        const search = req.query.search.toString();
        const group = req.query.group.toString();

        // the base query object
        let query = {};
        if (!!group) {
            query["group"] = group;
        }

        // making the model with query
        let data = this.FaqsModel.aggregate();
        data.match(query);
        data.match({
            $or: [{ question: { $regex: new RegExp(`.*${search}.*`, "i") } }, { answer: { $regex: new RegExp(`.*${search}.*`, "i") } }],
        });
        data.sort({ createdAt: "desc" });
        data.project("question answer group");

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
