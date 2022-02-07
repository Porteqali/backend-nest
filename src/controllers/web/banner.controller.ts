import { readFile } from "fs/promises";
import { Controller, Get, InternalServerErrorException, Post, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";

@Controller("banner")
export class BannerController {
    constructor() {}

    @Get("/")
    async getBanner(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const rawdata = await readFile("./static/banner.json")
            .then((data) => data)
            .catch((e) => {
                throw InternalServerErrorException;
            });
        const banner = JSON.parse(rawdata.toString());

        if (new Date(banner.endDate) < new Date(Date.now())) banner.status = "deactive";
        return res.json(banner);
    }
}
