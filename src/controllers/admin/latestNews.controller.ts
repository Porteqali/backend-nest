import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { unlink, readFile, writeFile } from "fs/promises";
import { AuthService } from "src/services/auth.service";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { UpdateBannerDto } from "src/dto/adminPanel/banner.dto";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { LinkDocument } from "src/models/links.schema";
import { UpdateLatestNewsDto } from "src/dto/adminPanel/latestNews";
import { CourseService } from "src/services/course.service";
import { randStr } from "src/helpers/str.helper";

@Controller("admin/latest-news")
export class LatestNewsController {
    constructor(
        private readonly authService: AuthService,
        private readonly courseService: CourseService,
        @InjectModel("Link") private readonly LinkModel: Model<LinkDocument>,
    ) {}

    @Get("/")
    async getInfo(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.latest-news.view"]))) throw new ForbiddenException();

        const rawdata = await readFile("./static/latest_news.json").then((data) => data);
        const news = JSON.parse(rawdata.toString());

        if (news.videoType == "link") {
            const link = await this.LinkModel.findOne({ internal: news.video }).exec();
            news.video = link ? link.external : "";
        }

        return res.json(news);
    }

    @Put("/")
    @UseInterceptors(FileFieldsInterceptor([{ name: "videoFile" }]))
    async editLatestNews(
        @UploadedFiles() uploads: Array<Express.Multer.File>,
        @Body() input: UpdateLatestNewsDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.latest-news.edit"]))) throw new ForbiddenException();

        const rawdata = await readFile("./static/latest_news.json").then((data) => data);
        const news = JSON.parse(rawdata.toString());

        // if video file is changes or turned into link... remove the old video file if any
        if ((!!uploads["videoFile"] || news.videoType != input.videoType) && news.videoType == "file") {
            if(!!news.video) await unlink(news.video.replace("/file/", "storage/")).catch((e) => {});
        }

        if (!!uploads["videoFile"] && input.videoType == "file") {
            const videoFile: any = uploads["videoFile"][0];
            const ogName = videoFile.originalname;
            const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);

            const randName = randStr(12);
            const url = `storage/private/${randName}.${extension}`;
            await writeFile(`./${url}`, Buffer.from(videoFile.buffer)).catch((e) => console.log(e));

            news.video = url.replace("storage/", "/file/");
        }
        if (input.videoType == "link") {
            news.video = await this.courseService.generateLinkForTopic(req, req.body.videoLink, "general");
        }

        news.title = input.title;
        news.text = input.text;
        news.link = input.link || "";
        news.link_text = input.link_text || "";
        news.status = input.status;
        news.videoType = input.videoType;
        await writeFile("./static/latest_news.json", JSON.stringify(news));

        return res.end();
    }
}
