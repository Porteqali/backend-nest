import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { Model } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { CourseDocument } from "src/models/courses.schema";
import { ArticleDocument } from "src/models/articles.schema";
import { DiscountService } from "./discount.service";

@Injectable()
export class SearchService {
    constructor(
        private readonly discountService: DiscountService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("Article") private readonly ArticleModel: Model<ArticleDocument>,
    ) {}

    async searchCourses(req: Request, res: Response, search) {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 10;

        const order = req.query.order ? req.query.order.toString() : "";

        // the base query object
        let query = {
            status: "active",
        };

        // sort
        let sort = {};
        switch (order) {
            case "oldest":
                sort["publishedAt"] = "asc";
                break;
            default:
                sort["publishedAt"] = "desc";
                break;
        }

        // making the model with query
        let data = this.CourseModel.aggregate();
        data.lookup({
            from: "coursegroups",
            localField: "groups",
            foreignField: "_id",
            as: "groups",
        });
        data.lookup({
            from: "users",
            localField: "teacher",
            foreignField: "_id",
            as: "teacher",
        });
        data.match(query);
        data.match({
            $or: [
                { name: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { description: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "teacher.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "teacher.family": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "groups.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { tags: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "topics.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });
        data.sort(sort);
        data.project("teacher.image teacher.name teacher.family image name description price groups buyCount score topics.time");

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

        // calculate the discount and tag
        for (let i = 0; i < results[0].data.length; i++) {
            results[0].data[i].discountInfo = await this.discountService.courseDiscount(req, results[0].data[i]._id);
        }

        // transform data
        results[0].data.map((row) => {
            let seconds = 0;
            row.topics.forEach((topic) => {
                seconds += parseInt(topic.time.hours) * 3600 + parseInt(topic.time.minutes) * 60 + parseInt(topic.time.seconds);
            });
            delete row.topics;
            row.totalTime = new Date(seconds * 1000).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0];
            return row;
        });

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }

    async searchTeachers(req: Request, res: Response, search) {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 10;

        const order = req.query.order ? req.query.order.toString() : "";

        // the base query object
        let query = {
            role: "teacher",
            status: "active",
        };

        // sort
        let sort = {};
        switch (order) {
            case "oldest":
                sort["createdAt"] = "asc";
                break;
            default:
                sort["createdAt"] = "desc";
                break;
        }

        // making the model with query
        let data = this.UserModel.aggregate();
        data.match(query);
        data.match({
            $or: [
                { name: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { family: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { description: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { title: { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });
        data.sort(sort);
        data.project("image title name family description socials");

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

    async searchArticles(req: Request, res: Response, search) {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 10;

        const order = req.query.order ? req.query.order.toString() : "";

        // the base query object
        let query = {
            status: "published",
        };

        // sort
        let sort = {};
        switch (order) {
            case "oldest":
                sort["publishedAt"] = "asc";
                break;
            default:
                sort["publishedAt"] = "desc";
                break;
        }

        // making the model with query
        let data = this.ArticleModel.aggregate();
        data.lookup({
            from: "articlecategories",
            localField: "category",
            foreignField: "_id",
            as: "category",
        });
        data.lookup({
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "author",
        });
        data.match(query);
        data.match({
            $or: [
                { title: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { description: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { tags: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { body: { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });
        data.sort(sort);
        data.project("author.image author.name author.family image imageVertical title slug description category.name likes publishedAt");

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
