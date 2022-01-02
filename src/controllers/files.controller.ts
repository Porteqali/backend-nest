import * as fs from "fs/promises";
import { Body, Controller, Get, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { FileService } from "src/services/file.service";

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

        const filepathArray = filepath.split("/");
        if (filepathArray[2] === "course_videos") await this.fileService.courseCheck(req, filepathArray);

        const isFileExists = await fs
            .access(filepath)
            .then(() => true)
            .catch(() => false);
        if (!isFileExists) return res.status(404).end();

        return res.sendFile(`${process.cwd()}/${filepath}`);
    }
}
