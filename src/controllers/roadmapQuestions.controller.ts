import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { RoadmapQuestionDocument } from "src/models/roadmapQuestions.schema";

@Controller("roadmap-questions")
export class RoadmapQuestionController {
    constructor(@InjectModel("RoadmapQuestion") private readonly RoadmapQuestionModel: Model<RoadmapQuestionDocument>) {}

    @Get("/")
    async getQuestions(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const questions: any = {};
        const questionResults = await this.RoadmapQuestionModel.find().populate("category", "_id name desc").exec();
        questionResults.forEach((question: any) => {
            if (!questions[question.category._id]) questions[question.category._id] = [];
            questions[question.category._id].push({ ...question.toJSON(), check: -1 });
        });

        return res.json({ questions });
    }
}
