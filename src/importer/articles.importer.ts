import { readFile } from "fs/promises";
import { Controller, Get, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ArticleDocument } from "src/models/articles.schema";

@Controller("importer/articles")
export class ArticlesImporter {
    constructor(@InjectModel("Article") private readonly ArticleModel: Model<ArticleDocument>) {}

    @Get("/")
    async getUser(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const rawdata = await readFile("./src/importer/json/blogs.json").then((data) => data);
        const articles = JSON.parse(rawdata.toString());

        articles.forEach((article) => {
            this.ArticleModel.create({
                author: "61ae02e46d1e11108802191e",
                image: article.blog_image,
                imageVertical: article.blog_image_vertical,
                title: article.title,
                slug: article.slug,
                description: article.desc,
                body: article.text,
                category: null,
                tags: [],
                metadata: {
                    thumbnail: article.blog_image,
                    title: article.title,
                    description: article.desc,
                    author: "test test",
                    keywords: "",
                },
                url_code: article.id,
                status: "published",
                publishedAt: new Date(Date.now()),
                createdAt: new Date(Date.now()),
            });
        });

        return res.json({ ok: 1 });
    }
}
