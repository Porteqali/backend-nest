import { readFile } from "fs/promises";
import { Body, Controller, Get, ImATeapotException, NotAcceptableException, NotFoundException, Post, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { FaqDocument } from "src/models/faqs.schema";

@Controller("importer/faqs")
export class FaqsImporter {
    constructor(@InjectModel("Faqs") private readonly FaqsModel: Model<FaqDocument>) {}

    @Get("/")
    async getUser(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const rawdata = await readFile("./src/importer/json/faqs.json").then((data) => data);
        const faqs = JSON.parse(rawdata.toString());

        faqs.forEach((faq) => {
            this.FaqsModel.create({
                question: faq.question,
                answer: faq.answer,
                group: "support",
                status: "published",
            });
        });

        return res.json(faqs);
    }
}
