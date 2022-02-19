import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { unlink, readFile } from "fs/promises";
import { hash } from "bcrypt";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { FilesInterceptor } from "@nestjs/platform-express";
import { randStr } from "src/helpers/str.helper";
import { TestimonialDocument } from "src/models/testimonials.schema";
import * as sharp from "sharp";
import { CreateNewTestimonialAdminDto, UpdateNewTestimonialDto } from "src/dto/adminPanel/testimonials.dto";

@Controller("admin/testimonials")
export class TestimonialsController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Testimonial") private readonly TestimonialModel: Model<TestimonialDocument>,
    ) {}

    @Get("/")
    async getTestimonials(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.testimonials.view"])) throw new ForbiddenException();

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
            case "نظر":
                sort = { comment: sortType };
                break;
            case "نمایش به عنوان":
                sort = { showAs: sortType };
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
        let data = this.TestimonialModel.aggregate();
        data.match(query);
        data.match({
            $or: [
                { fullname: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { title: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { comment: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { showAs: { $regex: new RegExp(`.*${search}.*`, "i") } },
            ],
        });
        data.sort(sort);
        data.project("_id image fullname title comment showAs createdAt");

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
    async getTestimonial(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.testimonials.view"])) throw new ForbiddenException();

        const testimonial = await this.TestimonialModel.findOne({ _id: req.params.id }).exec();
        if (!testimonial) throw new NotFoundException();
        return res.json(testimonial);
    }

    @Post("/")
    @UseInterceptors(FilesInterceptor("files"))
    async addTestimonial(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: CreateNewTestimonialAdminDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.testimonials.add"])) throw new ForbiddenException();

        let imageLink = "";
        if (!!files.length) {
            const ogName = files[0].originalname;
            const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (files[0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["حجم فایل باید کمتر از 2Mb باشد"] }]);
            // check file format
            let isMimeOk = extension == "png" || extension == "gif" || extension == "jpeg" || extension == "jpg";
            if (!isMimeOk) throw new UnprocessableEntityException([{ property: "image", errors: ["فرمت فایل معتبر نیست"] }]);

            const randName = randStr(10);
            const img = sharp(Buffer.from(files[0].buffer));
            img.resize(256);
            const url = `storage/public/user_avatars/${randName}.${extension}`;
            await img.toFile(url).catch((e) => console.log(e));

            imageLink = url.replace("storage/", "/file/");
        }

        await this.TestimonialModel.create({
            image: imageLink,
            fullname: input.fullname,
            title: input.title,
            comment: input.comment,
            showAs: input.showAs,
        });

        return res.end();
    }

    @Put("/:id")
    @UseInterceptors(FilesInterceptor("files"))
    async editTestimonial(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: UpdateNewTestimonialDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.testimonials.edit"])) throw new ForbiddenException();

        // find admin
        const testimonial = await this.TestimonialModel.findOne({ _id: req.params.id }).exec();
        if (!testimonial) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);

        let imageLink = "";
        if (!!files.length) {
            const ogName = files[0].originalname;
            const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (files[0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["حجم فایل باید کمتر از 2Mb باشد"] }]);
            // check file format
            let isMimeOk = extension == "png" || extension == "gif" || extension == "jpeg" || extension == "jpg";
            if (!isMimeOk) throw new UnprocessableEntityException([{ property: "image", errors: ["فرمت فایل معتبر نیست"] }]);

            // delete the old image from system
            if(!!testimonial.image) await unlink(testimonial.image.replace("/file/", "storage/")).catch((e) => {});

            const randName = randStr(10);
            const img = sharp(Buffer.from(files[0].buffer));
            img.resize(256);
            const url = `storage/public/user_avatars/${randName}.${extension}`;
            await img.toFile(url).catch((e) => console.log(e));

            imageLink = url.replace("storage/", "/file/");
        } else if (!!input.image && input.image != "") {
            imageLink = testimonial.image;
        }

        await this.TestimonialModel.updateOne(
            { _id: req.params.id },
            {
                image: imageLink,
                fullname: input.fullname,
                title: input.title,
                comment: input.comment,
                showAs: input.showAs,
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deleteTestimonial(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (! await this.authService.authorize(req, "admin", ["admin.testimonials.delete"])) throw new ForbiddenException();

        const data = await this.TestimonialModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete the admin
        await this.TestimonialModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
