import { Body, Controller, Delete, Get, Post, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserCourseDocument } from "src/models/userCourses.schema";
import { CommentDocument } from "src/models/comments.schema";
import { WalletTransactionDocument } from "src/models/walletTransactions.schema";

@Controller("user-profile")
export class UserProfileController {
    constructor(
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
        @InjectModel("Comment") private readonly CommentModel: Model<CommentDocument>,
        @InjectModel("WalletTransaction") private readonly WalletTransactionModel: Model<WalletTransactionDocument>,
    ) {}

    @Get("/courses")
    async getUserCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 10;

        // the base query object
        let query = {
            status: "ok",
            user: req.user.user._id,
        };

        // sort
        let sort = { createdAt: "desc" };

        // making the model with query
        let data = this.UserCourseModel.aggregate();
        data.match(query);
        data.lookup({
            from: "courses",
            localField: "course",
            foreignField: "_id",
            as: "course",
        });
        data.lookup({
            from: "users",
            localField: "course.teacher",
            foreignField: "_id",
            as: "teacher",
        });
        data.sort(sort);
        data.project("teacher.image teacher.name teacher.family course.teacher course._id course.topics course.name course.image course.status");

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
            let seconds = 0;
            row.course[0].topics.forEach((topic) => {
                seconds += parseInt(topic.time.hours) * 3600 + parseInt(topic.time.minutes) * 60 + parseInt(topic.time.seconds);
            });
            row.course[0].totalTime = new Date(seconds * 1000).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0];
            row.course[0].teacher = row.teacher[0];

            return row;
        });

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }

    @Get("/comments")
    async getUserComments(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 10;

        // the base query object
        let query = {
            user: req.user.user._id,
        };

        // sort
        let sort = { createdAt: "desc" };

        // making the model with query
        let data = this.CommentModel.aggregate();
        data.lookup({
            from: "courses",
            localField: "commentedOnId",
            foreignField: "_id",
            as: "course",
        });
        data.lookup({
            from: "articles",
            localField: "commentedOnId",
            foreignField: "_id",
            as: "article",
        });
        data.match(query);
        data.sort(sort);
        data.project("course.name course.image article.title article.image text status createdAt");

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
        results[0].data = results[0].data.map((row) => {
            if (row.course[0]) row.item = { name: row.course[0].name, image: row.course[0].image, type: "دوره" };
            if (row.article[0]) row.item = { name: row.article[0].title, image: row.article[0].image, type: "مقاله" };
            return row;
        });

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }

    @Get("/transactions/wallet")
    async getUserWalletTransactions(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 10;

        // the base query object
        let query = {
            user: req.user.user._id,
        };

        // sort
        let sort = { createdAt: "desc" };

        // making the model with query
        let data = this.WalletTransactionModel.aggregate();
        data.match(query);
        data.sort(sort);
        data.project("chargeAmount paidAmount transactionCode paymentMethod status createdAt");

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

    @Get("/transactions/course")
    async getUserCourseTransactions(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 10;

        // the base query object
        let query = {
            user: req.user.user._id,
        };

        // sort
        let sort = { "info.createdAt": "desc" };

        // making the model with query
        // let data = this.UserCourseModel.aggregate([{ $group: { _id: "$authority" } }]);
        let data = this.UserCourseModel.aggregate();
        data.match(query);
        data.lookup({
            from: "courses",
            localField: "course",
            foreignField: "_id",
            as: "course",
        });
        data.project("course.image course.name totalPrice paidAmount authority transactionCode paymentMethod status createdAt");
        data.group({ _id: "$authority", info: { $push: "$$ROOT" } });
        data.sort(sort);

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
