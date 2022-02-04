import { Body, Controller, Delete, Get, Post, Put, Query, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { unlink, writeFile } from "fs/promises";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { UserCourseDocument } from "src/models/userCourses.schema";
import { CourseDocument } from "src/models/courses.schema";
import * as Jmoment from "jalali-moment";
import * as sharp from "sharp";
import { CreateNewCourseDto, UpdateCourseDto } from "src/dto/adminPanel/courses.dto";
import { FileFieldsInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { randStr } from "src/helpers/str.helper";

@Controller("admin/courses")
export class CourseController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
    ) {}

    @Get("/topics/:id")
    async getCourseTopics(@Req() req: Request, @Res() res: Response): Promise<void | Response> {}

    @Put("/topics/:id")
    async editCourseTopics(@Req() req: Request, @Res() res: Response): Promise<void | Response> {}

    // =============================================================================

    @Get("/")
    async getCourses(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.courses.view"])) throw new ForbiddenException();

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
            case "استاد":
                sort = { "teacher.name": sortType, "teacher.family": sortType };
                break;
            case "مبلغ":
                sort = { price: sortType };
                break;
            case "گروه دوره":
                sort = { "groups.name": sortType };
                break;
            case "میزان خرید":
                sort = { buyCount: sortType };
                break;
            case "میزان بازدید":
                sort = { viewCount: sortType };
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
        let data = this.CourseModel.aggregate();
        data.lookup({
            from: "users",
            localField: "teacher",
            foreignField: "_id",
            as: "teacher",
        });
        data.lookup({
            from: "coursegroups",
            localField: "groups",
            foreignField: "_id",
            as: "groups",
        });
        data.match(query);
        data.sort(sort);
        data.project("image name description teacher.image teacher.name teacher.family groups.name price buyCount viewCount status createdAt");
        data.match({
            $or: [
                { name: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { description: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { price: { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "teacher.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "teacher.family": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { "groups.name": { $regex: new RegExp(`.*${search}.*`, "i") } },
                { status: { $regex: new RegExp(`.*${search}.*`, "i") } },
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

        // transform data
        results[0].data.map((row) => {
            row.tillCreatedAt = Jmoment(row.createdAt).locale("fa").fromNow();
            return row;
        });

        return res.json({
            records: results[0].data,
            page: page,
            total: total,
            pageTotal: Math.ceil(total / pp),
        });
    }

    @Get("/:id")
    async getCourse(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.courses.view"])) throw new ForbiddenException();

        const course = await this.CourseModel.findOne({ _id: req.params.id }).populate("teacher", "image name family").exec();
        if (!course) throw new NotFoundException();
        return res.json(course);
    }

    @Post("/")
    @UseInterceptors(FileFieldsInterceptor([{ name: "files" }, { name: "exerciseFiles" }]))
    async addCourse(
        @UploadedFiles() fileFields: Array<Express.Multer.File>,
        @Body() input: CreateNewCourseDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.courses.add"])) throw new ForbiddenException();

        const isTeacherExists = this.UserModel.exists({ _id: input.teacher, role: "teacher" });
        if (!isTeacherExists) throw new UnprocessableEntityException([{ property: "teacher", errors: ["استاد انتخابی برای دوره پیدا نشد"] }]);

        let imageLink = "";
        if (!!fileFields["files"] && !!fileFields["files"].length) {
            const ogName = fileFields["files"][0].originalname;
            const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (fileFields["files"][0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["حجم فایل باید کمتر از 2Mb باشد"] }]);
            // check file format
            let isMimeOk = extension == "png" || extension == "gif" || extension == "jpeg" || extension == "jpg";
            if (!isMimeOk) throw new UnprocessableEntityException([{ property: "image", errors: ["فرمت فایل معتبر نیست"] }]);

            const randName = randStr(10);
            const img = sharp(Buffer.from(fileFields["files"][0].buffer));
            img.resize(768);
            const url = `storage/public/course_images/${randName}.${extension}`;
            await img.toFile(url).catch((e) => console.log(e));
            imageLink = url.replace("storage/", "/file/");
        }

        const exerciseFilesDetails = req.body.exerciseFilesDetails ? JSON.parse(req.body.exerciseFilesDetails) : [];
        let exerciseFiles = [];
        if (!!fileFields["exerciseFiles"]) {
            for (let i = 0; i < fileFields["exerciseFiles"].length; i++) {
                const exerciseFile: any = fileFields["exerciseFiles"][i];
                const ogName = exerciseFile.originalname;
                const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);

                const randName = randStr(10);
                const url = `storage/public/course_exercise_files/${randName}.${extension}`;
                await writeFile(`./${url}`, Buffer.from(exerciseFile.buffer)).catch((e) => console.log(e));

                exerciseFiles.push({ name: exerciseFilesDetails[i].name, file: url.replace("storage/", "/file/"), size: exerciseFile.size });
            }
        }

        await this.CourseModel.create({
            image: imageLink,
            name: input.name,
            description: input.description,
            teacher: input.teacher,
            price: input.price,
            groups: input.groups.split(","),
            exerciseFiles: exerciseFiles,
            status: input.status,
            showInNew: input.showInNew == "true" ? true : false,
            commission: input.commission || null,
            tags: input.tags ? JSON.parse(input.tags) : null,
        });

        return res.end();
    }

    @Put("/:id")
    @UseInterceptors(FileFieldsInterceptor([{ name: "files" }, { name: "exerciseFiles" }]))
    async editCourse(
        @UploadedFiles() fileFields: Array<Express.Multer.File>,
        @Body() input: UpdateCourseDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.courses.edit"])) throw new ForbiddenException();

        // find course
        const courseResult = await this.CourseModel.findOne({ _id: req.params.id }).exec();
        if (!courseResult) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);
        const course = courseResult.toJSON();

        const isTeacherExists = this.UserModel.exists({ _id: input.teacher, role: "teacher" });
        if (!isTeacherExists) throw new UnprocessableEntityException([{ property: "teacher", errors: ["استاد انتخابی برای دوره پیدا نشد"] }]);

        let imageLink = "";
        if (!!fileFields["files"] && !!fileFields["files"].length) {
            const ogName = fileFields["files"][0].originalname;
            const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (fileFields["files"][0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["حجم فایل باید کمتر از 2Mb باشد"] }]);
            // check file format
            let isMimeOk = extension == "png" || extension == "gif" || extension == "jpeg" || extension == "jpg";
            if (!isMimeOk) throw new UnprocessableEntityException([{ property: "image", errors: ["فرمت فایل معتبر نیست"] }]);

            // delete the old image from system
            await unlink(course.image.replace("/file/", "storage/")).catch((e) => {});

            const randName = randStr(10);
            const img = sharp(Buffer.from(fileFields["files"][0].buffer));
            img.resize(768);
            const url = `storage/public/course_images/${randName}.${extension}`;
            await img.toFile(url).catch((e) => console.log(e));
            imageLink = url.replace("storage/", "/file/");
        } else if (!!input.image && input.image != "") {
            imageLink = course.image;
        }

        const exerciseFilesDetails = req.body.exerciseFilesDetails ? JSON.parse(req.body.exerciseFilesDetails) : [];
        const RemainedExerciseFilesIds = req.body.RemainedExerciseFilesIds ? JSON.parse(req.body.RemainedExerciseFilesIds) : [];
        let exerciseFiles: any = course.exerciseFiles || [];
        for (let i = 0; i < exerciseFiles.length; i++) {
            if (!RemainedExerciseFilesIds.includes(exerciseFiles[i]["_id"].toString())) {
                // delete excluded file
                await unlink(exerciseFiles[i]["file"].replace("/file/", "storage/")).catch((e) => {});
                exerciseFiles[i] = null;
            }
        }
        exerciseFiles = exerciseFiles.filter((el) => el !== null && typeof el !== "undefined");
        if (!!fileFields["exerciseFiles"]) {
            for (let i = 0; i < fileFields["exerciseFiles"].length; i++) {
                const exerciseFile: any = fileFields["exerciseFiles"][i];
                const ogName = exerciseFile.originalname;
                const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);

                const randName = randStr(10);
                const url = `storage/public/course_exercise_files/${randName}.${extension}`;
                await writeFile(`./${url}`, Buffer.from(exerciseFile.buffer)).catch((e) => console.log(e));

                exerciseFiles.push({ name: exerciseFilesDetails[i].name, file: url.replace("storage/", "/file/"), size: exerciseFile.size });
            }
        }

        const groups: any = input.groups.split(",");
        const commission: any = new Types.ObjectId(input.commission) || null;
        const teacher: any = new Types.ObjectId(input.teacher);

        await this.CourseModel.updateOne(
            { _id: req.params.id },
            {
                image: imageLink,
                name: input.name,
                description: input.description,
                teacher: teacher,
                price: parseInt(input.price),
                groups: groups,
                exerciseFiles: exerciseFiles,
                status: input.status,
                showInNew: input.showInNew == "true" ? true : false,
                commission: commission,
                tags: input.tags ? JSON.parse(input.tags) : null,
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deleteCourse(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.courses.delete"])) throw new ForbiddenException();

        const data = await this.CourseModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // TODO
        // also delete local video files and images

        // delete the course
        await this.CourseModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
