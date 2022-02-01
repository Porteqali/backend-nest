import { Body, Controller, Delete, Get, Post, Put, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { unlink, readFile, writeFile } from "fs/promises";
import { AuthService } from "src/services/auth.service";
import { FilesInterceptor } from "@nestjs/platform-express";
import { UpdateBannerDto } from "src/dto/adminPanel/banner.dto";
import * as sharp from "sharp";
import * as Jmoment from "jalali-moment";

@Controller("admin/banner")
export class BannerController {
    constructor(private readonly authService: AuthService) {}

    @Get("/")
    async getBanner(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.banner.view"])) throw new ForbiddenException();

        const rawdata = await readFile("./static/banner.json").then((data) => data);
        const banner = JSON.parse(rawdata.toString());

        if (!banner.endDate) banner.endDate = new Date(Date.now());

        return res.json(banner);
    }

    @Put("/")
    @UseInterceptors(FilesInterceptor("files"))
    async editBanner(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() input: UpdateBannerDto,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void | Response> {
        if (!this.authService.authorize(req, "admin", ["admin.banner.edit"])) throw new ForbiddenException();

        const rawdata = await readFile("./static/banner.json").then((data) => data);
        const banner = JSON.parse(rawdata.toString());

        let imageLink = "";
        if (!!files.length) {
            const ogName = files[0].originalname;
            const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);
            // check file size
            if (files[0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["حجم فایل باید کمتر از 2Mb باشد"] }]);
            // check file format
            let isMimeOk = extension == "png" || extension == "gif" || extension == "jpeg" || extension == "jpg";
            if (!isMimeOk) throw new UnprocessableEntityException([{ property: "image", errors: ["فرمت فایل معتبر نیست"] }]);

            // delete the old image from system
            if (banner.bgImage) await unlink(banner.bgImage.replace("/file/", "storage/")).catch((e) => {});

            const img = sharp(Buffer.from(files[0].buffer));
            img.resize(256);
            const url = `storage/private/banner.${extension}`;
            await img.toFile(url).catch((e) => console.log(e));

            imageLink = url.replace("storage/", "/file/");
        } else if (!!input.image && input.image != "") {
            imageLink = banner.bgImage;
        }

        const endDate = Jmoment.from(input.endDate, "fa", "YYYY-MM-DD hh:mm:ss");
        endDate.add("minutes", 206);

        banner.bgImage = imageLink;
        banner.bgColor = input.bgColor;
        banner.text = input.text || "";
        banner.code = input.code || "";
        banner.endDate = endDate.toDate();
        banner.status = input.status;
        await writeFile("./static/banner.json", JSON.stringify(banner));

        return res.end();
    }
}
