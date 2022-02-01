import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { FaqDocument } from "src/models/faqs.schema";
import { CreateNewFaqDto, UpdateFaqDto } from "src/dto/adminPanel/faqs.dto";

@Controller("admin/faqs")
export class FaqController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Faq") private readonly FaqModel: Model<FaqDocument>,
    ) {}

    @Get("/")
    async getFaqs(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.faqs.view"])) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "asc";
        switch (req.query.sort) {
            case "سوال":
                sort = { question: sortType };
                break;
            case "جواب":
                sort = { answer: sortType };
                break;
            case "وضعیت":
                sort = { status: sortType };
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
        let data = this.FaqModel.aggregate();
        data.match(query);
        data.match({
            $or: [
                { question: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { answer: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { status: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { group: { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });
        data.sort(sort);
        data.project("_id author question answer group status createdAt");

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
    async getFaq(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.faqs.view"])) throw new ForbiddenException();

        const faq = await this.FaqModel.findOne({ _id: req.params.id }).exec();
        if (!faq) throw new NotFoundException();
        return res.json(faq);
    }

    @Post("/")
    async addFaq(@Body() input: CreateNewFaqDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.faqs.add"])) throw new ForbiddenException();

        await this.FaqModel.create({
            question: input.question,
            answer: input.answer,
            group: input.group,
            status: input.status,
        });

        return res.end();
    }

    @Put("/:id")
    async editFaq(@Body() input: UpdateFaqDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.faqs.edit"])) throw new ForbiddenException();

        await this.FaqModel.updateOne(
            { _id: req.params.id },
            {
                question: input.question,
                answer: input.answer,
                group: input.group,
                status: input.status,
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deleteFaq(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.faqs.delete"])) throw new ForbiddenException();

        const data = await this.FaqModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete the thing
        await this.FaqModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
