import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { CreateNewRoadmapQuestionCategoryDto, UpdateRoadmapQuestionCategoryDto } from "src/dto/adminPanel/roadmapQuestionCategory.dto";
import { RoadmapQuestionDocument } from "src/models/roadmapQuestions.schema";
import { RoadmapQuestionCategoryDocument } from "src/models/roadmapQuestionCategories.schema";

@Controller("admin/roadmap-question-category")
export class RoadmapQuestionCategoryController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("RoadmapQuestion") private readonly RoadmapQuestionModel: Model<RoadmapQuestionDocument>,
        @InjectModel("RoadmapQuestionCategory") private readonly RoadmapQuestionCategoryModel: Model<RoadmapQuestionCategoryDocument>,
    ) {}

    @Get("/")
    async getRoadmapQuestionCategoryList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.roadmap-question-category.view"]))) throw new ForbiddenException();

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
        let data = this.RoadmapQuestionCategoryModel.aggregate();
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
    async getRoadmapQuestionCategory(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.roadmap-question-category.view"]))) throw new ForbiddenException();

        const roadmapQuestionCategory = await this.RoadmapQuestionCategoryModel.findOne({ _id: req.params.id }).exec();
        if (!roadmapQuestionCategory) throw new NotFoundException();
        return res.json(roadmapQuestionCategory);
    }

    @Post("/")
    async addRoadmapQuestionCategory(@Body() input: CreateNewRoadmapQuestionCategoryDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.roadmap-question-category.add"]))) throw new ForbiddenException();

        await this.RoadmapQuestionCategoryModel.create({ name: input.name, desc: input.desc, author: req.user.user._id });

        return res.end();
    }

    @Put("/:id")
    async editRoadmapQuestionCategory(@Body() input: UpdateRoadmapQuestionCategoryDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.roadmap-question-category.edit"]))) throw new ForbiddenException();

        // find roadmapQuestionCategory
        const roadmapQuestionCategory = await this.RoadmapQuestionCategoryModel.findOne({ _id: req.params.id }).exec();
        if (!roadmapQuestionCategory) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);

        await this.RoadmapQuestionCategoryModel.updateOne({ _id: req.params.id }, { name: input.name, desc: input.desc, author: req.user.user._id });

        return res.end();
    }

    @Delete("/:id")
    async deleteRoadmapQuestionCategory(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.roadmap-question-category.delete"]))) throw new ForbiddenException();

        const data = await this.RoadmapQuestionCategoryModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete the thing
        await this.RoadmapQuestionCategoryModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
