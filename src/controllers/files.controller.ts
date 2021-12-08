import { Body, Controller, Get, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import * as fs from "fs/promises";
import { AuthService } from "src/services/auth.service";

@Controller("file")
export class FilesController {
    constructor() {}

    @Get("/*")
    async register(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const filepath = `storage${req.url.replace("/file", "")}`;
        // TODO
        // get file from "/storage"
        // if file is private and needs special permission, we can check it here

        const isFileExists = await fs
            .access(filepath)
            .then(() => true)
            .catch(() => false);
        if (!isFileExists) return res.status(404).end();

        return res.sendFile(`${process.cwd()}/${filepath}`);
    }
}
