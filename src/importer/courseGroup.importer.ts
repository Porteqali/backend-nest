import { readFile } from "fs/promises";
import { Controller, Get, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CourseGroupDocument } from "src/models/courseGroups.schema";

@Controller("importer/course-groups")
export class CourseGroupImporter {
    constructor(@InjectModel("CourseGroup") private readonly CourseGroupModel: Model<CourseGroupDocument>) {}

    @Get("/")
    async getUser(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const rawdata = await readFile("./src/importer/json/course_groups.json").then((data) => data);
        const groups = JSON.parse(rawdata.toString());

        groups.forEach((group) => {
            this.CourseGroupModel.create({
                icon: "/file/public/course_group_icons/Figma.svg",
                name: group.name,
                topGroup: group.top_group,
                status: "active",
                createdAt: new Date(Date.now()),
            });
        });

        return res.json({ ok: 1 });
    }
}
