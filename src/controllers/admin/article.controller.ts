import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { unlink } from "fs/promises";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { FilesInterceptor } from "@nestjs/platform-express";
import { randStr } from "src/helpers/str.helper";
import * as sharp from "sharp";
import * as Jmoment from "jalali-moment";
import { ArticleDocument } from "src/models/articles.schema";
import { CreateNewArticleDto, UpdateArticleDto } from "src/dto/adminPanel/articles.dto";

@Controller("admin/articles")
export class ArticleController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Article") private readonly ArticleModel: Model<ArticleDocument>,
    ) {}

    @Post("/image-upload")
    @UseInterceptors(FilesInterceptor("files"))
    async uploadInTextImages(@UploadedFiles() files: Array<Express.Multer.File>, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.articles.add", "admin.articles.edit"], "OR")) throw new ForbiddenException();

        let imageLink = "";
        if (!!files.length) {
            const ogName = files[0].originalname;
            const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (files[0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["حجم فایل باید کمتر از 2Mb باشد"] }]);
            // check file format
            let isMimeOk = extension == "png" || extension == "gif" || extension == "jpeg" || extension == "jpg";
            if (!isMimeOk) throw new UnprocessableEntityException([{ property: "image", errors: ["فرمت فایل معتبر نیست"] }]);

            const randName = randStr(20);
            const img = sharp(Buffer.from(files[0].buffer));
            img.resize(1024);
            const url = `storage/public/article_images/${randName}.${extension}`;
            await img.toFile(url).catch((e) => console.log(e));

            imageLink = url.replace("storage/", "/file/");
        }

        return res.json({ location: imageLink });
    }

    // ======================================================================

    @Get("/")
    async getArticles(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.articles.view"])) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "asc";
        switch (req.query.sort) {
            case "عنوان":
                sort = { title: sortType };
                break;
            case "تاریخ انتشار":
                sort = { publishedAt: sortType };
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
        let data = this.ArticleModel.aggregate();
        data.match(query);
        data.match({
            $or: [
                { title: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { slug: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { description: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { tags: { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });
        data.sort(sort);
        data.project("_id image title slug description tags status publishedAt createdAt");

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
    async getArticle(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.articles.view"])) throw new ForbiddenException();

        const article = await this.ArticleModel.findOne({ _id: req.params.id }).exec();
        if (!article) throw new NotFoundException();
        return res.json(article);
    }

    @Post("/")
    @UseInterceptors(FilesInterceptor("files"))
    async addArticle(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: CreateNewArticleDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.articles.add"])) throw new ForbiddenException();

        const isSlugExists = await this.ArticleModel.exists({ slug: input.slug });
        if (isSlugExists) {
            throw new UnprocessableEntityException([{ property: "slug", errors: ["اسلاگ قبلا استفاده شده"] }]);
        }

        let thumbnailLink = "";
        let imageLink = "";
        let imageVerticalLink = "";
        if (!files[0].originalname) throw new UnprocessableEntityException([{ property: "image", errors: ["عکس اصلی مقاله را انتخاب کنید"] }]);
        if (!files[1].originalname) throw new UnprocessableEntityException([{ property: "imageVertical", errors: ["عکس عمودی مقاله را انتخاب کنید"] }]);
        if (!!files.length) {
            const ogName0 = files[0].originalname;
            const ogName1 = files[1].originalname;
            const extension0 = ogName0.slice(((ogName0.lastIndexOf(".") - 1) >>> 0) + 2);
            const extension1 = ogName1.slice(((ogName1.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (files[0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["حجم عکس باید کمتر از 2Mb باشد"] }]);
            if (files[1].size > 2097152) throw new UnprocessableEntityException([{ property: "imageVertical", errors: ["حجم عکس باید کمتر از 2Mb باشد"] }]);
            // check file format
            let isMimeOk0 = extension0 == "png" || extension0 == "gif" || extension0 == "jpeg" || extension0 == "jpg";
            let isMimeOk1 = extension1 == "png" || extension1 == "gif" || extension1 == "jpeg" || extension1 == "jpg";
            if (!isMimeOk0) throw new UnprocessableEntityException([{ property: "image", errors: ["فرمت عکس اصلی معتبر نیست"] }]);
            if (!isMimeOk1) throw new UnprocessableEntityException([{ property: "imageVertical", errors: ["فرمت عکس عمودی معتبر نیست"] }]);

            const randName0 = randStr(10);
            const randName1 = randStr(15);
            const thumbnailImg = sharp(Buffer.from(files[0].buffer));
            const img0 = sharp(Buffer.from(files[0].buffer));
            const img1 = sharp(Buffer.from(files[1].buffer));

            thumbnailImg.resize(256);
            img0.resize(1024);
            img1.resize(768);

            const thumbnailUrl = `storage/public/article_images/${randName0}_thumbnail.${extension0}`;
            const url0 = `storage/public/article_images/${randName0}.${extension0}`;
            const url1 = `storage/public/article_images/${randName1}.${extension1}`;

            await thumbnailImg.toFile(thumbnailUrl).catch((e) => console.log(e));
            await img0.toFile(url0).catch((e) => console.log(e));
            await img1.toFile(url1).catch((e) => console.log(e));

            thumbnailLink = thumbnailUrl.replace("storage/", "/file/");
            imageLink = url0.replace("storage/", "/file/");
            imageVerticalLink = url1.replace("storage/", "/file/");
        }

        const publishedAt = Jmoment.from(input.publishedAt, "fa", "YYYY-MM-DD hh:mm:ss");
        publishedAt.add("minutes", 206);

        await this.ArticleModel.create({
            author: req.user.user._id,
            image: imageLink,
            imageVertical: imageVerticalLink,
            title: input.title,
            slug: input.slug,
            publishedAt: publishedAt.toDate(),
            status: input.status,
            description: input.description,
            body: input.body,
            tags: input.tags ? JSON.parse(input.tags) : null,
            metadata: {
                thumbnail: thumbnailLink,
                title: input.metadataTitle,
                description: input.metadataDescription,
                author: `${req.user.user.name} ${req.user.user.family}`,
                keywords: JSON.parse(input.tags).toString(),
            },
            inTextImageList: JSON.parse(input.inTextImageList),
        });

        return res.end();
    }

    @Put("/:id")
    @UseInterceptors(FilesInterceptor("files"))
    async editArticle(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: UpdateArticleDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.articles.edit"])) throw new ForbiddenException();

        const isSlugExists = await this.ArticleModel.exists({ _id: { $ne: req.params.id }, slug: input.slug });
        if (isSlugExists) {
            throw new UnprocessableEntityException([{ property: "slug", errors: ["اسلاگ قبلا استفاده شده"] }]);
        }

        // find article
        const article = await this.ArticleModel.findOne({ _id: req.params.id }).exec();
        if (!article) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);

        let thumbnailLink = "";
        let imageLink = "";
        if (!!files[0] && !!files[0].originalname) {
            const ogName0 = files[0].originalname;
            const extension0 = ogName0.slice(((ogName0.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (files[0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["حجم فایل باید کمتر از 2Mb باشد"] }]);
            // check file format
            let isMimeOk0 = extension0 == "png" || extension0 == "gif" || extension0 == "jpeg" || extension0 == "jpg";
            if (!isMimeOk0) throw new UnprocessableEntityException([{ property: "image", errors: ["فرمت فایل معتبر نیست"] }]);

            // delete the old image from system
            await unlink(article.image.replace("/file/", "storage/")).catch((e) => {});

            const randName0 = randStr(10);
            const img0 = sharp(Buffer.from(files[0].buffer));
            img0.resize(1024);
            const url0 = `storage/public/article_images/${randName0}.${extension0}`;
            await img0.toFile(url0).catch((e) => console.log(e));
            imageLink = url0.replace("storage/", "/file/");

            const thumbnailImg = sharp(Buffer.from(files[0].buffer));
            thumbnailImg.resize(256);
            const thumbnailUrl = `storage/public/article_images/${randName0}_thumbnail.${extension0}`;
            await thumbnailImg.toFile(thumbnailUrl).catch((e) => console.log(e));
            thumbnailLink = thumbnailUrl.replace("storage/", "/file/");
        } else if (!!input.image && input.image != "") {
            imageLink = article.image;
            thumbnailLink = article.metadata.thumbnail;
        }

        let imageVerticalLink = "";
        if (!!files[1] && !!files[1].originalname) {
            const ogName1 = files[1].originalname;
            const extension1 = ogName1.slice(((ogName1.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (files[1].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["حجم فایل باید کمتر از 2Mb باشد"] }]);
            // check file format
            let isMimeOk1 = extension1 == "png" || extension1 == "gif" || extension1 == "jpeg" || extension1 == "jpg";
            if (!isMimeOk1) throw new UnprocessableEntityException([{ property: "image", errors: ["فرمت فایل معتبر نیست"] }]);

            // delete the old image from system
            await unlink(article.imageVertical.replace("/file/", "storage/")).catch((e) => {});

            const randName1 = randStr(15);
            const img1 = sharp(Buffer.from(files[1].buffer));
            img1.resize(768);
            const url1 = `storage/public/article_images/${randName1}.${extension1}`;
            await img1.toFile(url1).catch((e) => console.log(e));
            imageLink = url1.replace("storage/", "/file/");
        } else if (!!input.imageVertical && input.imageVertical != "") {
            imageVerticalLink = article.imageVertical;
        }

        const publishedAt = Jmoment.from(input.publishedAt, "fa", "YYYY-MM-DD hh:mm:ss");
        publishedAt.add("minutes", 206);

        await this.ArticleModel.updateOne(
            { _id: req.params.id },
            {
                author: req.user.user._id,
                image: imageLink,
                imageVertical: imageVerticalLink,
                title: input.title,
                slug: input.slug,
                publishedAt: publishedAt.toDate(),
                status: input.status,
                description: input.description,
                body: input.body,
                tags: input.tags ? JSON.parse(input.tags) : null,
                metadata: {
                    thumbnail: thumbnailLink || "",
                    title: input.metadataTitle,
                    description: input.metadataDescription,
                    author: `${req.user.user.name} ${req.user.user.family}`,
                    keywords: JSON.parse(input.tags).toString(),
                },
                inTextImageList: JSON.parse(input.inTextImageList),
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deleteArticle(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.articles.delete"])) throw new ForbiddenException();

        const data = await this.ArticleModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete image list first
        for (let i = 0; i < data.inTextImageList.length; i++) {
            const imageLink = data.inTextImageList[i];
            await unlink(imageLink.replace("/file/", "storage/")).catch((e) => {});
        }

        // delete the article
        await this.ArticleModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
