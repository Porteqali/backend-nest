import { Body, Controller, Delete, Get, Post, Put, Query, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { hash } from "bcrypt";
import { UserDocument } from "src/models/users.schema";
import { PermissionGroupDocument } from "src/models/permissionGroups.schema";
import { AuthService } from "src/services/auth.service";
import { CommentDocument } from "src/models/comments.schema";
import { CourseDocument } from "src/models/courses.schema";
import { ArticleDocument } from "src/models/articles.schema";
import { ReplyToCommentDto, UpdateCommentDto } from "src/dto/adminPanel/comments.dto";

@Controller("admin/users-comments")
export class CommentsController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("PermissionGroup") private readonly PermissionGroupModel: Model<PermissionGroupDocument>,
        @InjectModel("Comment") private readonly CommentModel: Model<CommentDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("Article") private readonly ArticleModel: Model<ArticleDocument>,
    ) {}

    // =============================================================================

    @Get("/")
    async getCommentsList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.users-comments.view"])) throw new ForbiddenException();

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
            case "مورد":
                sort = { "course.name": sortType, "article.title": sortType };
                break;
            case "متن":
                sort = { text: sortType };
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
        if (!!req.query.status) {
            let status: any = req.query.status;
            query["status"] = { $in: status.split(",") };
        }

        // making the model with query
        let data = this.CommentModel.aggregate();
        data.lookup({ from: "users", localField: "user", foreignField: "_id", as: "user" });
        data.lookup({ from: "courses", localField: "commentedOnId", foreignField: "_id", as: "course" });
        data.lookup({ from: "articles", localField: "commentedOnId", foreignField: "_id", as: "article" });
        data.match(query);
        data.sort(sort);
        data.project({
            "user.image": 1,
            fullname: { $concat: [{ $arrayElemAt: ["$user.name", 0] }, " ", { $arrayElemAt: ["$user.family", 0] }] },
            "course.name": 1,
            "article.title": 1,
            text: 1,
            status: 1,
            createdAt: 1,
        });
        data.match({
            $or: [
                { fullname: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { text: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "course.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "article.title": { $regex: new RegExp(`.*${search}.*`, "i") } },
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
    async getComment(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.users-comments.view"])) throw new ForbiddenException();

        let comment: any = await this.CommentModel.findOne({ _id: req.params.id }).populate("user", "image name family").exec();
        if (!comment) throw new NotFoundException();

        comment = comment.toJSON();
        switch (comment.commentedOn) {
            case "course":
                comment.on = await this.CourseModel.findOne({ _id: comment.commentedOnId }).select("image name").exec();
                break;
            case "article":
                comment.on = await this.ArticleModel.findOne({ _id: comment.commentedOnId }).select("image title").exec();
                break;
        }

        return res.json(comment);
    }

    @Post("/:id/reply")
    async makeReply(@Body() input: ReplyToCommentDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.users-comments.edit"])) throw new ForbiddenException();

        // find comment
        const comment = await this.CommentModel.findOne({ _id: req.params.id }).exec();
        if (!comment) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای پاسخ دادن پیدا نشد"] }]);

        await this.CommentModel.create({
            user: req.user.user._id,
            commentedOn: comment.commentedOn,
            commentedOnId: comment.commentedOnId,
            topComment: comment._id,
            text: input.comment,
            status: "active",
        });

        return res.end();
    }

    @Put("/:id")
    async editComment(@Body() input: UpdateCommentDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.users-comments.edit"])) throw new ForbiddenException();

        // find comment
        const comment = await this.CommentModel.findOne({ _id: req.params.id }).exec();
        if (!comment) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);

        await this.CommentModel.updateOne(
            { _id: req.params.id },
            {
                comment: input.comment,
                status: input.status,
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deleteComment(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.users-comments.delete"])) throw new ForbiddenException();

        const data = await this.CommentModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete the comment
        await this.CommentModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
