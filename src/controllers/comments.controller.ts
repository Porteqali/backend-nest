import { Body, Controller, Get, Post, Req, Res, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import * as Jmoment from "jalali-moment";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { SendCommentDto } from "src/dto/sendComment.dto";
import { CommentDocument } from "src/models/comments.schema";
import { ArticleDocument } from "src/models/articles.schema";
import { CourseDocument } from "src/models/courses.schema";

@Controller("comments")
export class CommentsController {
    constructor(
        @InjectModel("Comment") private readonly CommentModel: Model<CommentDocument>,
        @InjectModel("Article") private readonly ArticleModel: Model<ArticleDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
    ) {}

    @Get("/")
    async getComments(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 10;

        const commentedOn = !!req.query.type ? req.query.type.toString() : "";
        if (!commentedOn) throw new UnprocessableEntityException([{ property: "", errors: ["امکان نمایش نظر وجود ندارد"] }]);

        const commentedOnId = !!req.query.commentedOn ? req.query.commentedOn.toString() : "";
        if (!commentedOnId) throw new UnprocessableEntityException([{ property: "", errors: ["امکان نمایش نظر وجود ندارد"] }]);

        // the base query object
        let query = {
            status: "active",
            commentedOn: commentedOn,
            commentedOnId: new Types.ObjectId(commentedOnId),
            topComment: null,
        };

        // making the model with query
        let data = this.CommentModel.aggregate();
        data.lookup({
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "author",
        });
        data.match(query);
        data.sort({ createdAt: "desc" });
        data.project("author.image author.name author.family author.role text createdAt");

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

        // transform data
        results[0].data.map((row) => {
            row.createdAt = Jmoment(row.createdAt).locale("fa").fromNow();
            return row;
        });

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }

    @Get("/replies")
    async getChildComments(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 10;

        const commentId = req.query.commentId ? req.query.commentId.toString() : "";
        if (!commentId) throw new UnprocessableEntityException([{ property: "", errors: ["امکان نمایش نظر وجود ندارد"] }]);

        // the base query object
        let query = {
            status: "active",
            topComment: new Types.ObjectId(commentId),
        };

        // making the model with query
        let data = this.CommentModel.aggregate();
        data.lookup({
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "author",
        });
        data.match(query);
        data.sort({ createdAt: "desc" });
        data.project("author.image author.name author.family author.role text createdAt");

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

        // transform data
        results[0].data.map((row) => {
            row.createdAt = Jmoment(row.createdAt).locale("fa").fromNow();
            return row;
        });

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }

    @Post("/send")
    async sendComment(@Body() input: SendCommentDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        switch (input.type) {
            case "course":
                const doesCourseExists = await this.CourseModel.exists({ _id: input.commentedOn });
                if (!doesCourseExists) throw new UnprocessableEntityException([{ property: "", errors: ["دوره پیدا نشد"] }]);
                break;
            case "article":
                const doesArticleExists = await this.ArticleModel.exists({ _id: input.commentedOn });
                if (!doesArticleExists) throw new UnprocessableEntityException([{ property: "", errors: ["مقاله پیدا نشد"] }]);
                break;
        }

        // check if topComment exists
        if (!!input.topComment) {
            const topComment = await this.CommentModel.findOne({ _id: input.topComment }).exec();
            if (!topComment) throw new UnprocessableEntityException([{ property: "", errors: ["نظر برای پاسخگویی پیدا نشد"] }]);
        }

        const comment = await this.CommentModel.create({
            user: req.user.user._id,
            commentedOn: input.type,
            commentedOnId: input.commentedOn,
            topComment: input.topComment || null,
            text: input.text,
            status: "waiting_for_review",
            createdAt: new Date(Date.now()),
        });

        return res.json({});
    }
}
