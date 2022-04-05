import { Body, Controller, Delete, Get, Post, Put, Query, Req, Res, UnprocessableEntityException, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import * as sharp from "sharp";
import { CreateNewMajorDto, UpdateMajorDto } from "src/dto/adminPanel/majors.dto";
import { MajorDocument } from "src/models/majors.schema";
import { FilesInterceptor } from "@nestjs/platform-express";
import { randStr } from "src/helpers/str.helper";
import { unlink } from "fs/promises";

@Controller("admin/majors")
export class MajorController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Major") private readonly MajorModel: Model<MajorDocument>,
    ) {}

    @Get("/bundles/:id")
    async getMajorBundles(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.majors.view"]))) throw new ForbiddenException();

        const majorResult = await this.MajorModel.findOne({ _id: req.params.id }).populate("bundles", "title").exec();
        if (!majorResult) throw new NotFoundException();
        const major: any = majorResult.toJSON();

        return res.json({ bundles: major.bundles, major: major });
    }

    @Put("/bundles/:id")
    async editMajorBundles(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.majors.edit"]))) throw new ForbiddenException();

        // find major
        const majorResult = await this.MajorModel.findOne({ _id: req.params.id }).exec();
        if (!majorResult) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);
        const major: any = majorResult.toJSON();

        const bundles = req.body.bundles ? req.body.bundles : [];
        let topics = [];
        for (let i = 0; i < bundles.length; i++) topics.push(bundles[i]._id);

        await this.MajorModel.updateOne({ _id: req.params.id }, { bundles: topics }).exec();
        return res.end();
    }

    // =============================================================================

    @Get("/")
    async getMajors(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.majors.view"]))) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "desc";
        switch (req.query.sort) {
            case "عنوان":
                sort = { title: sortType };
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
        let data = this.MajorModel.aggregate();
        data.match(query);
        data.sort(sort);
        data.project("image title desc createdAt");
        data.match({
            $or: [
                { title: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { desc: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { text: { $regex: new RegExp(`.*${search}.*`, "i") } },
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
    async getMajor(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.majors.view"]))) throw new ForbiddenException();

        const major = await this.MajorModel.findOne({ _id: req.params.id }).populate("bundles", "title").exec();
        if (!major) throw new NotFoundException();
        return res.json(major);
    }

    @Post("/")
    @UseInterceptors(FilesInterceptor("files"))
    async addMajor(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: CreateNewMajorDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.majors.add"]))) throw new ForbiddenException();

        const isSlugExists = await this.MajorModel.exists({ slug: input.slug });
        if (isSlugExists) throw new UnprocessableEntityException([{ property: "slug", errors: ["اسلاگ قبلا استفاده شده"] }]);

        let thumbnailLink = "";
        let imageLink = "";
        if (!files[0].originalname) throw new UnprocessableEntityException([{ property: "image", errors: ["عکس اصلی مقاله را انتخاب کنید"] }]);
        if (!!files.length) {
            const ogName0 = files[0].originalname;
            const extension0 = ogName0.slice(((ogName0.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (files[0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["حجم عکس باید کمتر از 2Mb باشد"] }]);
            // check file format
            let isMimeOk0 = extension0 == "png" || extension0 == "gif" || extension0 == "jpeg" || extension0 == "jpg";
            if (!isMimeOk0) throw new UnprocessableEntityException([{ property: "image", errors: ["فرمت عکس اصلی معتبر نیست"] }]);

            const randName0 = randStr(10);
            const thumbnailImg = sharp(Buffer.from(files[0].buffer));
            const img0 = sharp(Buffer.from(files[0].buffer));

            thumbnailImg.resize(128);
            img0.resize(128);

            const thumbnailUrl = `storage/public/article_images/${randName0}_thumbnail.${extension0}`;
            const url0 = `storage/public/article_images/${randName0}.${extension0}`;

            await thumbnailImg.toFile(thumbnailUrl).catch((e) => console.log(e));
            await img0.toFile(url0).catch((e) => console.log(e));

            thumbnailLink = thumbnailUrl.replace("storage/", "/file/");
            imageLink = url0.replace("storage/", "/file/");
        }

        await this.MajorModel.create({
            image: imageLink,
            slug: input.slug,
            title: input.title,
            desc: input.desc,
            text: input.text,
            metadata: {
                thumbnail: thumbnailLink,
                title: input.metadataTitle,
                description: input.metadataDescription,
                author: `${req.user.user.name} ${req.user.user.family}`,
            },
        });

        return res.end();
    }

    @Put("/:id")
    @UseInterceptors(FilesInterceptor("files"))
    async editMajor(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: UpdateMajorDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.majors.edit"]))) throw new ForbiddenException();

        const isSlugExists = await this.MajorModel.exists({ _id: { $ne: req.params.id }, slug: input.slug });
        if (isSlugExists) throw new UnprocessableEntityException([{ property: "slug", errors: ["اسلاگ قبلا استفاده شده"] }]);

        // find bundle
        const major = await this.MajorModel.findOne({ _id: req.params.id }).exec();
        if (!major) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);

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
            if (!!major.image) await unlink(major.image.replace("/file/", "storage/")).catch((e) => {});

            const randName0 = randStr(10);
            const img0 = sharp(Buffer.from(files[0].buffer));
            img0.resize(128);
            const url0 = `storage/public/article_images/${randName0}.${extension0}`;
            await img0.toFile(url0).catch((e) => console.log(e));
            imageLink = url0.replace("storage/", "/file/");

            const thumbnailImg = sharp(Buffer.from(files[0].buffer));
            thumbnailImg.resize(128);
            const thumbnailUrl = `storage/public/article_images/${randName0}_thumbnail.${extension0}`;
            await thumbnailImg.toFile(thumbnailUrl).catch((e) => console.log(e));
            thumbnailLink = thumbnailUrl.replace("storage/", "/file/");
        } else if (!!input.image && input.image != "") {
            imageLink = major.image;
            thumbnailLink = major.metadata.thumbnail;
        }

        await this.MajorModel.updateOne(
            { _id: req.params.id },
            {
                image: imageLink,
                slug: input.slug,
                title: input.title,
                desc: input.desc,
                text: input.text,
                metadata: {
                    thumbnail: thumbnailLink || "",
                    title: input.metadataTitle,
                    description: input.metadataDescription,
                    author: `${req.user.user.name} ${req.user.user.family}`,
                },
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deleteMajor(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.majors.delete"]))) throw new ForbiddenException();

        const major = await this.MajorModel.findOne({ _id: req.params.id }).exec();
        if (!major) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete the major
        await this.MajorModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
