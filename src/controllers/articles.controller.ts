import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ArticleDocument } from "src/models/articles.schema";
import { ArticleCategoryDocument } from "src/models/articleCategories.schema";

@Controller()
export class ArticlesController {
    constructor(
        @InjectModel("Article") private readonly ArticleModel: Model<ArticleDocument>,
        @InjectModel("ArticleCategory") private readonly ArticleCategoryModel: Model<ArticleCategoryDocument>,
    ) {}

    @Get("/top-article")
    async getTopArticle(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const article = await this.ArticleModel.findOne({ status: "published" })
            .sort({ publishedAt: "desc" })
            .populate("author", "-_id name family")
            .populate("category", "-_id name")
            .exec();
        return res.json(article);
    }

    @Get("/most-populars-articles")
    async getMostPopularArticles(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const article = await this.ArticleModel.find({ status: "published" })
            .sort({ likes: "desc" })
            .limit(10)
            .populate("author", "-_id name family")
            .populate("category", "-_id name")
            .exec();
        return res.json(article);
    }

    @Get("/articles")
    async getArticles(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 10;

        const search = req.query.search ? req.query.search.toString() : "";
        const order = req.query.order ? req.query.order.toString() : "";
        const category = req.query.category ? req.query.category.toString() : "";

        // the base query object
        let query = {
            status: "published",
        };
        if (!!category) {
            query["category.name"] = category;
        }

        // sort
        let sort = {};
        switch (order) {
            case "most-popular":
                sort["likes"] = "desc";
                break;
            case "oldest":
                sort["publishedAt"] = "asc";
                break;
            default:
                sort["publishedAt"] = "desc";
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
        data.project("author.name author.family image imageVertical title slug description category.name likes publishedAt");

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

    @Get("/article-categories")
    async getArticlesCategories(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const categories = await this.ArticleCategoryModel.find({}).exec();

        let options = {};
        categories.forEach((category) => {
            options[category.name] = { name: category.name, value: category.name };
        });

        return res.json(options);
    }

    @Get("/article/:slug")
    async getSingleArticle(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const article = await this.ArticleModel.findOne({ slug: req.params.slug, status: "published" })
            .populate("author", "-_id name family title description socials")
            .populate("category", "-_id name")
            .exec();

        const newArticles = await this.ArticleModel.find({ status: "published" })
            .sort({ publishedAt: "desc" })
            .limit(3)
            .populate("author", "-_id name family title description socials")
            .populate("category", "-_id name")
            .exec();

        // TODO
        const similarArticles = [];

        // TODO
        const popularArticles = [];

        return res.json({ article, newArticles, similarArticles, popularArticles });
    }
}
