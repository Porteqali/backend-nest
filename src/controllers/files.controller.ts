import * as fs from "fs/promises";
import { Body, Controller, Get, Req, Res } from "@nestjs/common";
import { get as httpsGet } from "https";
import { Request, Response } from "express";
import { FileService } from "src/services/file.service";
import { loadUser } from "src/helpers/auth.helper";

@Controller("file")
export class FilesController {
    constructor(private readonly fileService: FileService) {}

    @Get("/*")
    async getFile(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        let filepath = `storage${req.url.replace("/file", "")}`;
        filepath = filepath.split("../").join("");

        // TODO
        // get file from "/storage"
        // if file is private and needs special permission, we can check it here

        const loadedUser = await loadUser(req);
        const filepathArray = filepath.split("/");

        // if link is a course video check if user have access to it
        if (filepathArray[2] === "course_videos") await this.fileService.courseCheck(req, filepathArray, loadedUser);

        if (req.query.stream) {
            // TODO
            // generate link base on file type and location and cdn base url
            const streamLink = `https://porteqali.com/course_topic_videos/62/3f58a81c-c3b2-43a5-b24f-7f64203c477d.mp4`;
            httpsGet(streamLink, (response) => {
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

        return res.status(404).end();
    }
}
