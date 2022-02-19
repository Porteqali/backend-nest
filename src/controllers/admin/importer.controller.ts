import { Body, Controller, Post, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { unlink, readFile, writeFile } from "fs/promises";
import { AuthService } from "src/services/auth.service";
import { FilesInterceptor } from "@nestjs/platform-express";
import { randStr } from "src/helpers/str.helper";
import { UserDocument } from "src/models/users.schema";
import { Model } from "mongoose";
import { ContactRequestDocument } from "src/models/contactRequests.schema";
import { InjectModel } from "@nestjs/mongoose";

@Controller("admin/importer")
export class ImporterController {
    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("ContactRequest") private readonly ContactRequestModel: Model<ContactRequestDocument>,
    ) {}

    @Post("/")
    @UseInterceptors(FilesInterceptor("files"))
    async import(@UploadedFiles() files: Array<Express.Multer.File>, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.importer.import"]))) throw new ForbiddenException();

        const collection = req.body.collection ? req.body.collection.toString() : "";
        if (!collection) throw new UnprocessableEntityException([{ property: "collection", errors: ["کالکشن انتخاب نشده"] }]);

        const collectionList = ["ContactRequests"];
        if (!collectionList.includes(collection)) throw new UnprocessableEntityException([{ property: "collection", errors: ["کالکشن وجود ندارد"] }]);

        if (!files.length && !files[0]) throw new UnprocessableEntityException([{ property: "file", errors: ["فایلی برای ایمپورت انتخاب نشده"] }]);

        const ogName = files[0].originalname;
        const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);
        // check file size
        if (files[0].size > 524288) throw new UnprocessableEntityException([{ property: "file", errors: ["حجم فایل باید کمتر از 500Kb باشد"] }]);
        // check file format
        let isMimeOk = extension == "json";
        if (!isMimeOk) throw new UnprocessableEntityException([{ property: "file", errors: ["فرمت فایل معتبر نیست"] }]);
        // save the file
        const randomName = randStr(22);
        const url = `storage/private/${randomName}.${extension}`;
        await writeFile(`./${url}`, Buffer.from(files[0].buffer)).catch((e) => console.log(e));
        // read the file
        const rawdata = await readFile(`./${url}`).then((data) => data);
        const json = JSON.parse(rawdata.toString());
        // delete the uploaded file
        await unlink(url).catch((e) => {});

        switch (collection) {
            case "ContactRequests":
                await this.import_ContactRequests(json);
                break;
        }

        return res.end();
    }

    // ============================================================

    private async import_ContactRequests(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                imports.push({
                    name: "-",
                    family: "-",
                    mobile: "-",
                    email: "-",
                    issue: "-",
                    message: row.request,
                    status: row.seen == "1" ? "viewed" : "new",
                    createdAt: new Date(row.created_at),
                });
            }
            await this.ContactRequestModel.insertMany(imports);
        } catch (e) {
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }
}
