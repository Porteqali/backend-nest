import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { readFile, writeFile } from "fs/promises";
import { AuthService } from "src/services/auth.service";
import { FilesInterceptor } from "@nestjs/platform-express";
import { UpdateContactInfoDto } from "src/dto/adminPanel/contactInfo.dto";

@Controller("admin/contact-info")
export class ContactInfoController {
    constructor(private readonly authService: AuthService) {}

    @Get("/")
    async getContactInfo(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.contact-info.view"])) throw new ForbiddenException();

        const rawdata = await readFile("./static/contact_info.json").then((data) => data);
        const contactInfo = JSON.parse(rawdata.toString());

        return res.json(contactInfo);
    }

    @Put("/")
    @UseInterceptors(FilesInterceptor("files"))
    async editContactInfo(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: UpdateContactInfoDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.contact-info.edit"])) throw new ForbiddenException();

        const rawdata = await readFile("./static/contact_info.json").then((data) => data);
        const contactInfo = JSON.parse(rawdata.toString());

        contactInfo.tel = input.tel;
        contactInfo.email = input.email;
        contactInfo.post_code = input.post_code;
        contactInfo.address = input.address;
        contactInfo.socials = input.socials || {};
        await writeFile("./static/contact_info.json", JSON.stringify(contactInfo));

        return res.end();
    }
}
