import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { CreateNewArticleGroupDto, UpdateArticleGroupDto } from "src/dto/adminPanel/articleGroups.dto";
import { ArticleCategoryDocument } from "src/models/articleCategories.schema";
import { ArticleDocument } from "src/models/articles.schema";

@Controller("admin/article-groups")
export class ArticleGroupsController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Article") private readonly ArticleModel: Model<ArticleDocument>,
        @InjectModel("ArticleCategory") private readonly ArticleCategoryModel: Model<ArticleCategoryDocument>,
    ) {}

    @Get("/")
    async getArticleGroupList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.article-groups.view"]))) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "desc";
        switch (req.query.sort) {
            case "نام گروه":
                sort = { name: sortType };
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
        let data = this.ArticleCategoryModel.aggregate();
        data.match(query);
        data.match({
            $or: [{ name: { $regex: new RegExp(`.*${search}.*`, "i") } }],
        });
        data.sort(sort);
        data.project("name createdAt");

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
    async getArticleGroup(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.article-groups.view"]))) throw new ForbiddenException();

        const articleGroup = await this.ArticleCategoryModel.findOne({ _id: req.params.id }).exec();
        if (!articleGroup) throw new NotFoundException();
        return res.json(articleGroup);
    }

    @Post("/")
    async addArticleGroup(@Body() input: CreateNewArticleGroupDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.article-groups.add"]))) throw new ForbiddenException();

        await this.ArticleCategoryModel.create({ name: input.name, author: req.user.user._id });

        return res.end();
    }

    @Put("/:id")
    async editArticleGroup(@Body() input: UpdateArticleGroupDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.article-groups.edit"]))) throw new ForbiddenException();

        // find articleGroup
        const articleGroup = await this.ArticleCategoryModel.findOne({ _id: req.params.id }).exec();
        if (!articleGroup) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);

        await this.ArticleCategoryModel.updateOne({ _id: req.params.id }, { name: input.name, author: req.user.user._id });

        return res.end();
    }

    @Delete("/:id")
    async deleteArticleGroup(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.article-groups.delete"]))) throw new ForbiddenException();

        const data = await this.ArticleCategoryModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete the thing
        await this.ArticleCategoryModel.deleteOne({ _id: req.params.id }).exec();

        const articleCategoryId: any = req.params.id;
        await this.ArticleModel.updateMany({ category: articleCategoryId }, { category: null }).exec();

        return res.end();
    }
}
