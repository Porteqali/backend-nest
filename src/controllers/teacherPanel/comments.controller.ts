import { Body, Controller, Delete, Get, NotFoundException, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as Jmoment from "jalali-moment";
import { AuthService } from "src/services/auth.service";
import { CommentDocument } from "src/models/comments.schema";
import { ReplyToCommentDto, UpdateCommentDto } from "src/dto/adminPanel/comments.dto";
import { CourseDocument } from "src/models/courses.schema";

@Controller("teacher-panel/comments")
export class CommentsController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("Comment") private readonly CommentModel: Model<CommentDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
    ) {}

    @Get("/")
    async getTeacherComments(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "teacher", [], "AND"))) throw new ForbiddenException();

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
                sort = { "course.name": sortType };
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
        let query = {
            commentedOn: "course",
        };

        // filters
        if (!!req.query.status) {
            let status: any = req.query.status;
            query["status"] = { $in: status.split(",") };
        }

        // making the model with query
        let data = this.CommentModel.aggregate();
        data.match(query);
        data.lookup({
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
        });
        data.lookup({
            from: "courses",
            let: { course_id: "$commentedOnId" },
            pipeline: [
                { $match: { $expr: { $and: [{ $eq: ["$$course_id", "$_id"] }, { $eq: ["$teacher", req.user.user._id] }] } } },
                { $project: { image: 1, name: 1 } },
            ],
            as: "course",
        });
        data.match({ course: { $exists: true, $ne: [] } });
        data.sort(sort);
        data.project({
            "user.image": 1,
            fullname: { $concat: [{ $arrayElemAt: ["$user.name", 0] }, " ", { $arrayElemAt: ["$user.family", 0] }] },
            "course.image": 1,
            "course.name": 1,
            text: 1,
            status: 1,
            createdAt: 1,
        });
        if (!!search) {
            data.match({
                $or: [
                    { "course.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { text: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { fullname: { $regex: new RegExp(`.*${search}.*`, "i") } },
                    { status: { $regex: new RegExp(`.*${search}.*`, "i") } },
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

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }

    @Get("/:id")
    async getComment(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "teacher", [], "AND"))) throw new ForbiddenException();

        let comment: any = await this.CommentModel.findOne({ _id: req.params.id, commentedOn: "course" }).populate("user", "image name family").exec();
        if (!comment) throw new NotFoundException();

        comment = comment.toJSON();
        comment.on = await this.CourseModel.findOne({ _id: comment.commentedOnId }).select("image name").exec();

        return res.json(comment);
    }

    @Post("/:id/reply")
    async makeReply(@Body() input: ReplyToCommentDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "teacher", [], "AND"))) throw new ForbiddenException();

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
        if (!(await this.authService.authorize(req, "teacher", [], "AND"))) throw new ForbiddenException();
        
        // find comment
        const comment = await this.CommentModel.findOne({ _id: req.params.id }).exec();
        if (!comment) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);

        // access edit only if the commenter of the comment is the teacher
        if (comment.user.toString() != req.user.user._id) throw new NotFoundException([{ property: "record", errors: ["امکان ویرایش وجود ندارد"] }]);

        await this.CommentModel.updateOne({ _id: req.params.id }, { comment: input.comment });

        return res.end();
    }
}
