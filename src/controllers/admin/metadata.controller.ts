import { Body, Controller, Delete, Get, InternalServerErrorException, NotFoundException, Post, Put, Req, Res, UnprocessableEntityException } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { AuthService } from "src/services/auth.service";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { MetadataDocument } from "src/models/metadatas.schema";
import { UserDocument } from "src/models/users.schema";
import { CreateNewMetadataDto, UpdateMetadataDto } from "src/dto/adminPanel/metadatas.dto";

@Controller("admin/metadata")
export class MetadataController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Metadata") private readonly MetadataModel: Model<MetadataDocument>,
    ) {}

    @Get("/")
    async getMetadataList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.metadata.view"]))) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "asc";
        switch (req.query.sort) {
            case "صفحه":
                sort = { page: sortType };
                break;
            case "عنوان":
                sort = { title: sortType };
                break;
            case "توضیحات":
                sort = { description: sortType };
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
        let data = this.MetadataModel.aggregate();
        data.match(query);
        data.sort(sort);
        data.project("page title description createdAt");
        data.match({
            $or: [
                { page: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { title: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { description: { $regex: new RegExp(`.*${search}.*`, "i") } },
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
    async getMetadata(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.metadata.view"]))) throw new ForbiddenException();

        const metadata = await this.MetadataModel.findOne({ _id: req.params.id }).exec();
        if (!metadata) throw new NotFoundException();
        return res.json(metadata);
    }

    @Post("/")
    async addMetadata(@Body() input: CreateNewMetadataDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.metadata.add"]))) throw new ForbiddenException();

        // check if page is unique metadata
        const isPageExists = await this.MetadataModel.exists({ page: input.page });
        if (isPageExists) throw new UnprocessableEntityException([{ property: "slug", errors: ["صفحه وارد شده وجود دارد"] }]);

        await this.MetadataModel.create({
            page: input.page,
            title: input.title,
            description: input.description,
            keywords: input.keywords,
            canonical: input.canonical,
            themeColor: input.themeColor,
            site: input.site,
            language: input.language,
        });

        return res.end();
    }

    @Put("/:id")
    async editMetadata(@Body() input: UpdateMetadataDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.metadata.edit"]))) throw new ForbiddenException();

        // find metadata
        const metadata = await this.MetadataModel.findOne({ _id: req.params.id }).exec();
        if (!metadata) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);

        const isPageExists = await this.MetadataModel.exists({ _id: { $ne: req.params.id }, page: input.page });
        if (isPageExists) throw new UnprocessableEntityException([{ property: "slug", errors: ["صفحه وارد شده وجود دارد"] }]);

        await this.MetadataModel.updateOne(
            { _id: req.params.id },
            {
                page: input.page,
                title: input.title,
                description: input.description,
                keywords: input.keywords,
                canonical: input.canonical,
                themeColor: input.themeColor,
                site: input.site,
                language: input.language,
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deleteMetadata(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.metadata.delete"]))) throw new ForbiddenException();

        const data = await this.MetadataModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        if (data.page == "home") throw new ForbiddenException([{ property: "delete", errors: ["امکان حذف متادیتا صفحه اصلی وجود ندارد!"] }]);

        // delete the thing
        await this.MetadataModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
