import { readFile } from "fs/promises";
import { Controller, Get, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CourseDocument } from "src/models/courses.schema";

@Controller("importer/courses")
export class CourseImporter {
    constructor(@InjectModel("Course") private readonly CourseModel: Model<CourseDocument>) {}

    @Get("/")
    async getUser(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const rawdata = await readFile("./src/importer/json/courses.json").then((data) => data);
        const courses = JSON.parse(rawdata.toString());

        let insert = [];
        courses.forEach((course) => {
            insert.push({
                oid: course.id,
                image: course.course_image,
                name: course.name,
                teacher: "61b62c70d3d39924cc7db275",
                description: course.description,
                price: course.tuition,
                exerciseFiles: [],
                groups: ["61beee14f51a310d7242c8fb"],
                tags: course.tags.split(","),
                status: course.disabled == "0" ? "active" : "deactive",
                commission: null,
                buyCount: course.buy_count,
                viewCount: course.view_count,
                score: course.score,
                showInNew: course.show_in_new == "0" ? false : true,
                topics: null,
                createdAt: new Date(Date.now()),
            });
        });
        await this.CourseModel.insertMany(insert);

        return res.json({ ok: 1 });
    }
}
