import { readFile } from "fs/promises";
import { Controller, Get, InternalServerErrorException, Post, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";

@Controller("contact-info")
export class ContactInfoController {
    constructor() {}

    @Get("/")
    async getTeachers(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const rawdata = await readFile("./static/contact_info.json")
            .then((data) => data)
            .catch((e) => {
                throw InternalServerErrorException;
            });
        const contact_info = JSON.parse(rawdata.toString());
        return res.json(contact_info);
    }
}
