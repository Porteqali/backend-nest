import * as fs from "fs/promises";
import { Body, Controller, Get, Req, Res } from "@nestjs/common";
import { get as httpsGet } from "https";
import { Request, Response } from "express";
import { FileService } from "src/services/file.service";
import { loadUser } from "src/helpers/auth.helper";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { LinkDocument } from "src/models/links.schema";

@Controller("file")
export class FilesController {
    constructor(private readonly fileService: FileService, @InjectModel("Link") private readonly LinkModel: Model<LinkDocument>) {}

    @Get("/*")
    async getFile(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        let filepath = `storage${req.url.replace("/file", "")}`;
        filepath = filepath.split("../").join("");

        const loadedUser = await loadUser(req);
        const filepathArray = filepath.split("/");

        // if link is a course video check if user have access to it
        if (filepathArray[2] === "course_videos") await this.fileService.courseCheck(req, req.url, filepathArray, loadedUser);

        if (filepathArray[1] === "stream") {
            // get external link then send request and serve it
            const link = await this.LinkModel.findOne({ internal: req.url }).exec();
            if (!link || !link.external) return res.status(404).end();

            httpsGet(link.external, (response) => {
                if (response.statusCode >= 200 && response.statusCode < 400) {
                    try {
                        res.writeHead(response.statusCode, { ...response.headers });
                        response.pipe(res);
                    } catch (e) {}
                } else return res.status(response.statusCode).end();
            });
        } else {
            const isFileExists = await fs
                .access(filepath)
                .then(() => true)
                .catch(() => false);
            if (!isFileExists) return res.status(404).end();
            return res.sendFile(`${process.cwd()}/${filepath}`);
        }

        if (filepathArray[1] !== "stream") return res.status(404).end();
    }
}
