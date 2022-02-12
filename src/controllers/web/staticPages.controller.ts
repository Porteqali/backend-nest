import { readFile } from "fs/promises";
import { Controller, Get, InternalServerErrorException, Post, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";

@Controller("static-pages")
export class StaticPagesController {
    constructor() {}

    @Get("/:page")
    async getPageInfo(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const rawdata = await readFile(`./static/${req.params.page}.json`)
            .then((data) => data)
            .catch((e) => {
                throw InternalServerErrorException;
            });
        const json = JSON.parse(rawdata.toString());

        return res.json(json);
    }
}
