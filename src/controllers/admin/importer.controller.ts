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
import { CollaborateRequestDocument } from "src/models/collaborateRequests.schema";
import { CourseGroupDocument } from "src/models/courseGroups.schema";
import { CommissionDocument } from "src/models/commissions.schema";
import { FaqDocument } from "src/models/faqs.schema";

@Controller("admin/importer")
export class ImporterController {
    private collectionList = [
        "ContactRequests",
        "CollaborateRequests",
        "CourseGroups",
        "Commissions",
        "Faqs",
        "Admins",
        "Teachers",
        "Marketers",
        "Users",
        "Articles",
        "Courses",
        "Comments",
        "CommissionPayments",
        "CourseRating",
        "MarketerCourses",
        "UserCourses",
    ];

    constructor(
        private readonly authService: AuthService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("ContactRequest") private readonly ContactRequestModel: Model<ContactRequestDocument>,
        @InjectModel("CollaborateRequest") private readonly CollaborateRequestModel: Model<CollaborateRequestDocument>,
        @InjectModel("CourseGroup") private readonly CourseGroupModel: Model<CourseGroupDocument>,
        @InjectModel("Commission") private readonly CommissionModel: Model<CommissionDocument>,
        @InjectModel("Faq") private readonly FaqModel: Model<FaqDocument>,
    ) {}

    @Post("/")
    @UseInterceptors(FilesInterceptor("files"))
    async import(@UploadedFiles() files: Array<Express.Multer.File>, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.importer.import"]))) throw new ForbiddenException();

        const collection = req.body.collection ? req.body.collection.toString() : "";
        if (!collection) throw new UnprocessableEntityException([{ property: "collection", errors: ["کالکشن انتخاب نشده"] }]);

        if (!this.collectionList.includes(collection)) throw new UnprocessableEntityException([{ property: "collection", errors: ["کالکشن وجود ندارد"] }]);

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
            case "CollaborateRequests":
                await this.import_CollaborateRequests(json);
                break;
            case "CourseGroups":
                await this.import_CourseGroups(json);
                break;
            case "Commissions":
                await this.import_Commissions(json);
                break;
            case "Faqs":
                await this.import_Faqs(json);
                break;

            case "Admins":
                await this.import_Admins(json);
                break;
            case "Teachers":
                await this.import_Teachers(json);
                break;
            case "Marketers":
                await this.import_Marketers(json);
                break;
            case "Users":
                await this.import_Users(json);
                break;

            case "Articles":
                await this.import_Articles(json);
                break;
            case "Courses":
                await this.import_Courses(json);
                break;

            case "Comments":
                await this.import_Comments(json);
                break;
            case "CommissionPayments":
                await this.import_CommissionPayments(json);
                break;
            case "CourseRatings":
                await this.import_CourseRatings(json);
                break;
            case "MarketerCourses":
                await this.import_MarketerCourses(json);
                break;
            case "UserCourses":
                await this.import_UserCourses(json);
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
                    name: row.name,
                    family: row.family,
                    mobile: row.phone,
                    email: row.email,
                    issue: row.issue,
                    message: row.message,
                    status: row.seen == "1" ? "viewed" : "new",
                    createdAt: new Date(row.created_at),
                });
            }
            await this.ContactRequestModel.insertMany(imports);
        } catch (e) {
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }

    private async import_CollaborateRequests(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                imports.push({
                    name: "-",
                    family: "-",
                    mobile: "-",
                    email: "-",
                    suggestiveRole: "-",
                    description: row.request,
                    status: row.seen == "1" ? "viewed" : "new",
                    createdAt: new Date(row.created_at),
                });
            }
            await this.CollaborateRequestModel.insertMany(imports);
        } catch (e) {
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }

    private async import_CourseGroups(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                imports.push({ icon: "", name: row.name, topGroup: row.top_group, status: "active", createdAt: new Date(row.created_at) });
            }
            await this.CourseGroupModel.insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }

    private async import_Commissions(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                imports.push({ name: row.name, type: row.type, amount: row.amount, createdAt: new Date(row.created_at) });
            }
            await this.CommissionModel.insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }

    private async import_Faqs(json) {
        try {
            const admin = await this.UserModel.findOne({ role: "admin" }).exec();
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                imports.push({
                    author: admin._id,
                    question: row.question,
                    answer: row.answer,
                    group: "support",
                    status: "published",
                    createdAt: new Date(row.created_at),
                });
            }
            await this.FaqModel.insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }

    private async import_Admins(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                imports.push({
                    image: "",
                    name: row.name,
                    family: row.family,
                    email: row.email,
                    mobile: row.phone || "",
                    password: row.password,
                    role: "admin",
                    status: row.disable == "1" ? "deactive" : "active",
                    createdAt: new Date(row.created_at),
                });
            }
            await this.UserModel.insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }

    private async import_Teachers(json) {
        try {
            const commission = await this.CommissionModel.findOne().sort({ _id: "asc" }).exec();
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];

                // row.groups = 'item1,item2,item3,...'
                const groups = [];
                const courseGroups = await this.CourseGroupModel.find({ name: { $in: row.groups.split(",") } }).exec();
                courseGroups.forEach((item) => groups.push(item._id));

                imports.push({
                    image: `https://porteqali.com/img/teachers/${row.avatar_image}`,
                    name: row.name,
                    family: row.family,
                    email: row.email,
                    emailVerifiedAt: row.confirm == "1" ? new Date(Date.now()) : null,
                    mobile: row.phone || "",
                    password: row.password,
                    role: "teacher",
                    commissionBalance: parseInt(row.wallet_balance),
                    groups: groups,
                    description: row.description,
                    nationalCode: row.national_code,
                    nationalNumber: row.national_number,
                    birthDate: row.birthdate,
                    fatherName: row.father_name,
                    commission: commission._id,
                    financial: {
                        cardNumber: row.card_number,
                        cardOwnerName: row.card_owner,
                        cardBankName: row.bank_name,
                        shebaNumber: row.sheba_number,
                    },
                    status: row.ban == "1" ? "deactive" : "active",
                    createdAt: new Date(row.created_at),
                });
            }
            await this.UserModel.insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }

    private async import_Marketers(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                imports.push({
                    image: "",
                    name: row.name,
                    family: row.family,
                    email: "",
                    mobile: row.phone || "",
                    password: row.password,
                    role: "marketer",
                    address: row.address,
                    postalCode: row.post_code,
                    marketingCode: row.code,
                    period: row.period,
                    nationalCode: row.national_id,
                    status: row.ban == "1" ? "deactive" : "active",
                    createdAt: new Date(row.created_at),
                });
            }
            await this.UserModel.insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }

    private async import_Users(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                imports.push({
                    // name: row.name,
                    createdAt: new Date(row.created_at),
                });
            }
            // await this..insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }

    private async import_Articles(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                imports.push({
                    // name: row.name,
                    createdAt: new Date(row.created_at),
                });
            }
            // await this..insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }

    private async import_Courses(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                imports.push({
                    // name: row.name,
                    createdAt: new Date(row.created_at),
                });
            }
            // await this..insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }

    private async import_Comments(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                imports.push({
                    // name: row.name,
                    createdAt: new Date(row.created_at),
                });
            }
            // await this..insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }

    private async import_CommissionPayments(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                imports.push({
                    // name: row.name,
                    createdAt: new Date(row.created_at),
                });
            }
            // await this..insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }

    private async import_CourseRatings(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                imports.push({
                    // name: row.name,
                    createdAt: new Date(row.created_at),
                });
            }
            // await this..insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }

    private async import_MarketerCourses(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                imports.push({
                    // name: row.name,
                    createdAt: new Date(row.created_at),
                });
            }
            // await this..insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }

    private async import_UserCourses(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                imports.push({
                    // name: row.name,
                    createdAt: new Date(row.created_at),
                });
            }
            // await this..insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["اطلاعات به درستی ایمپورت نشدند"] }]);
        }
    }
}
