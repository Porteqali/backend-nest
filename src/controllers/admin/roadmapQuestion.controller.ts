import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { CreateNewRoadmapQuestionDto, UpdateRoadmapQuestionDto } from "src/dto/adminPanel/roadmapQuestion.dto";
import { RoadmapQuestionDocument } from "src/models/roadmapQuestions.schema";
import { RoadmapQuestionCategoryDocument } from "src/models/roadmapQuestionCategories.schema";

@Controller("admin/roadmap-questions")
export class RoadmapQuestionController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("RoadmapQuestion") private readonly RoadmapQuestionModel: Model<RoadmapQuestionDocument>,
        @InjectModel("RoadmapQuestionCategory") private readonly RoadmapQuestionCategoryModel: Model<RoadmapQuestionCategoryDocument>,
    ) {}

    @Get("/")
    async getRoadmapQuestionList(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.roadmap-questions.view"]))) throw new ForbiddenException();

        const search = req.query.search ? req.query.search.toString() : "";
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const pp = req.query.pp ? parseInt(req.query.pp.toString()) : 25;

        // sort
        let sort = {};
        const sortType = req.query.sort_type ? req.query.sort_type : "desc";
        switch (req.query.sort) {
            case "سوال":
                sort = { question: sortType };
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
        let data = this.RoadmapQuestionModel.aggregate();
        data.match(query);
        data.match({
            $or: [{ question: { $regex: new RegExp(`.*${search}.*`, "i") } }],
        });
        data.sort(sort);
        data.project("question createdAt");

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
    async getRoadmapQuestion(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.roadmap-questions.view"]))) throw new ForbiddenException();

        const roadmapQuestion = await this.RoadmapQuestionModel.findOne({ _id: req.params.id }).exec();
        if (!roadmapQuestion) throw new NotFoundException();
        return res.json(roadmapQuestion);
    }

    @Post("/")
    async addRoadmapQuestion(@Body() input: CreateNewRoadmapQuestionDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.roadmap-questions.add"]))) throw new ForbiddenException();

        const answers = [
            { optionNumber: 1, text: input.option1, majorPoints: [] },
            { optionNumber: 2, text: input.option2, majorPoints: [] },
            { optionNumber: 3, text: input.option3 || "", majorPoints: [] },
            { optionNumber: 4, text: input.option4 || "", majorPoints: [] },
        ];

        for (const majorId in input.majors) {
            const major = input.majors[majorId];
            answers[0].majorPoints.push({ major: major._id, point: major.options.opt1 });
            answers[1].majorPoints.push({ major: major._id, point: major.options.opt2 });
            answers[2].majorPoints.push({ major: major._id, point: major.options.opt3 });
            answers[3].majorPoints.push({ major: major._id, point: major.options.opt4 });
        }

        await this.RoadmapQuestionModel.create({
            author: req.user.user._id,
            question: input.question,
            answers: answers,
            category: input.questionGroup,
        });

        return res.end();
    }

    @Put("/:id")
    async editRoadmapQuestion(@Body() input: UpdateRoadmapQuestionDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.roadmap-questions.edit"]))) throw new ForbiddenException();

        // find roadmapQuestion
        const roadmapQuestion = await this.RoadmapQuestionModel.findOne({ _id: req.params.id }).exec();
        if (!roadmapQuestion) throw new NotFoundException([{ property: "record", errors: ["رکوردی برای ویرایش پیدا نشد"] }]);

        const answers: any = [
            { optionNumber: 1, text: input.option1, majorPoints: [] },
            { optionNumber: 2, text: input.option2, majorPoints: [] },
            { optionNumber: 3, text: input.option3 || "", majorPoints: [] },
            { optionNumber: 4, text: input.option4 || "", majorPoints: [] },
        ];

        for (const majorId in input.majors) {
            const major = input.majors[majorId];
            answers[0].majorPoints.push({ major: major._id, point: major.options.opt1 });
            answers[1].majorPoints.push({ major: major._id, point: major.options.opt2 });
            answers[2].majorPoints.push({ major: major._id, point: major.options.opt3 });
            answers[3].majorPoints.push({ major: major._id, point: major.options.opt4 });
        }

        await this.RoadmapQuestionModel.updateOne(
            { _id: req.params.id },
            {
                author: req.user.user._id,
                question: input.question,
                answers: answers,
                category: input.questionGroup,
            },
        );

        return res.end();
    }

    @Delete("/:id")
    async deleteRoadmapQuestion(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.roadmap-questions.delete"]))) throw new ForbiddenException();

        const data = await this.RoadmapQuestionModel.findOne({ _id: req.params.id }).exec();
        if (!data) throw new NotFoundException([{ property: "delete", errors: ["رکورد پیدا نشد!"] }]);

        // delete the thing
        await this.RoadmapQuestionModel.deleteOne({ _id: req.params.id }).exec();

        return res.end();
    }
}
