import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { readFile, unlink, writeFile } from "fs/promises";
import { UserDocument } from "src/models/users.schema";
import { AuthService } from "src/services/auth.service";
import { FilesInterceptor } from "@nestjs/platform-express";
import { randStr } from "src/helpers/str.helper";
import * as sharp from "sharp";

@Controller("admin/staticPages")
export class StaticPagesController {
    constructor(private readonly authService: AuthService, @InjectModel("User") private readonly UserModel: Model<UserDocument>) {}

    @Post("/image-upload")
    @UseInterceptors(FilesInterceptor("files"))
    async uploadInTextImages(@UploadedFiles() files: Array<Express.Multer.File>, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", [], "AND"))) throw new ForbiddenException();

        let imageLink = "";
        if (!!files.length) {
            const ogName = files[0].originalname;
            const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (files[0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["حجم فایل باید کمتر از 2Mb باشد"] }]);
            // check file format
            let isMimeOk = extension == "png" || extension == "gif" || extension == "jpeg" || extension == "jpg";
            if (!isMimeOk) throw new UnprocessableEntityException([{ property: "image", errors: ["فرمت فایل معتبر نیست"] }]);

            const randName = randStr(20);
            const img = sharp(Buffer.from(files[0].buffer));
            img.resize(1024);
            const url = `storage/public/article_images/${randName}.${extension}`;
            await img.toFile(url).catch((e) => console.log(e));

            imageLink = url.replace("storage/", "/file/");
        }

        return res.json({ location: imageLink });
    }

    // ======================================================================

    @Get("/:page")
    async getPageInfo(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.page.terms-and-conditions.edit", "admin.page.privacy-policy.edit"], "OR")))
            throw new ForbiddenException();

        const rawdata = await readFile(`./static/${req.params.page}.json`)
            .then((data) => data)
            .catch((e) => {
                throw new InternalServerErrorException();
            });
        const json = JSON.parse(rawdata.toString());

        return res.json(json);
    }

    @Put("/privacy_policy")
    async editPrivacyPolicyPage(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.page.privacy-policy.edit"]))) throw new ForbiddenException();

        const rawdata = await readFile(`./static/privacy_policy.json`)
            .then((data) => data)
            .catch((e) => {
                throw new InternalServerErrorException();
            });
        const json = JSON.parse(rawdata.toString());

        json.text = req.body.text;
        await writeFile(`./static/privacy_policy.json`, JSON.stringify(json));

        return res.end();
    }

    @Put("/terms_and_conditions")
    async editTermsAndConditionsPage(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.page.terms-and-conditions.edit"]))) throw new ForbiddenException();

        const rawdata = await readFile(`./static/terms_and_conditions.json`)
            .then((data) => data)
            .catch((e) => {
                throw new InternalServerErrorException();
            });
        const json = JSON.parse(rawdata.toString());

        json.text = req.body.text;
        await writeFile(`./static/terms_and_conditions.json`, JSON.stringify(json));

        return res.end();
    }
}
