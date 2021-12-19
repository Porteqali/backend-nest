import { readFile } from "fs/promises";
import { Controller, Get, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CourseDocument } from "src/models/courses.schema";

@Controller("importer/course-topics")
export class CourseTopicImporter {
    constructor(@InjectModel("Course") private readonly CourseModel: Model<CourseDocument>) {}

    @Get("/")
    async getUser(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const rawdata = await readFile("./src/importer/json/course_topics.json").then((data) => data);
        const topics = JSON.parse(rawdata.toString());

        for (let i = 0; i < topics.length; i++) {
            let topic = topics[i];
            const course = await this.CourseModel.findOne({ oid: topic.course_id }).exec();

            let oldTopics = course.topics != null ? [...course.topics] : [];
            
            let newTopics = [
                ...oldTopics,
                {
                    order: topic.order,
                    name: topic.name,
                    time: {
                        hours: topic.time.split(":")[0],
                        minutes: topic.time.split(":")[1],
                        seconds: topic.time.split(":")[2],
                    },
                    description: topic.description,
                    file: topic.video_link,
                    isFree: topic.is_free == "0" ? false : true,
                    isFreeForUsers: topic.is_free_for_users == "0" ? false : true,
                    status: "active",
                },
            ];

            await this.CourseModel.updateOne({ oid: topic.course_id }, { topics: newTopics }).exec();
        }

        return res.json({ ok: 1 });
    }
}
