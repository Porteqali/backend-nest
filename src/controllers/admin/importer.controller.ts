import { Body, Controller, Post, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { unlink, readFile, writeFile } from "fs/promises";
import { AuthService } from "src/services/auth.service";
import { FilesInterceptor } from "@nestjs/platform-express";
import { randStr } from "src/helpers/str.helper";
import { UserDocument } from "src/models/users.schema";
import { Model, Schema } from "mongoose";
import { ContactRequestDocument } from "src/models/contactRequests.schema";
import { InjectModel } from "@nestjs/mongoose";
import { CollaborateRequestDocument } from "src/models/collaborateRequests.schema";
import { CourseGroupDocument } from "src/models/courseGroups.schema";
import { CommissionDocument } from "src/models/commissions.schema";
import { FaqDocument } from "src/models/faqs.schema";
import { ArticleDocument } from "src/models/articles.schema";
import { CourseService } from "src/services/course.service";
import { CourseDocument } from "src/models/courses.schema";
import { CommentDocument } from "src/models/comments.schema";
import { CommissionPaymentDocument } from "src/models/commissionPayments.schema";
import { CourseRatingDocument } from "src/models/courseRatings.schema";
import { MarketerCoursesDocument } from "src/models/marketerCourses.schema";
import { UserCourseDocument } from "src/models/userCourses.schema";

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
        private readonly courseService: CourseService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("ContactRequest") private readonly ContactRequestModel: Model<ContactRequestDocument>,
        @InjectModel("CollaborateRequest") private readonly CollaborateRequestModel: Model<CollaborateRequestDocument>,
        @InjectModel("CourseGroup") private readonly CourseGroupModel: Model<CourseGroupDocument>,
        @InjectModel("Commission") private readonly CommissionModel: Model<CommissionDocument>,
        @InjectModel("Faq") private readonly FaqModel: Model<FaqDocument>,
        @InjectModel("Article") private readonly ArticleModel: Model<ArticleDocument>,
        @InjectModel("Course") private readonly CourseModel: Model<CourseDocument>,
        @InjectModel("Comment") private readonly CommentModel: Model<CommentDocument>,
        @InjectModel("CommissionPayment") private readonly CommissionPaymentModel: Model<CommissionPaymentDocument>,
        @InjectModel("CourseRating") private readonly CourseRatingModel: Model<CourseRatingDocument>,
        @InjectModel("MarketerCourse") private readonly MarketerCourseModel: Model<MarketerCoursesDocument>,
        @InjectModel("UserCourse") private readonly UserCourseModel: Model<UserCourseDocument>,
    ) {}

    @Post("/")
    @UseInterceptors(FilesInterceptor("files"))
    async import(@UploadedFiles() files: Array<Express.Multer.File>, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        if (!(await this.authService.authorize(req, "admin", ["admin.importer.import"]))) throw new ForbiddenException();

        // check every course rating and make sure its between 1 and 8
        // await this.CourseRatingModel.updateMany({ rating: { $gt: 8 } }, { rating: Math.floor(Math.random() * (7 - 2 + 1) + 2) }).exec();

        // then recalc course rating and save it
        const courses = await this.CourseModel.find().select("_id name").exec();
        for (let i = 0; i < courses.length; i++) {
            const course = courses[i];
            const ratings = await this.CourseRatingModel.find({ course: course._id }).exec();
            const ratingCount = await this.CourseRatingModel.countDocuments({ course: course._id }).exec();
            let ratingSum = 0;
            ratings.forEach((rating) => (ratingSum += rating.rating));

            let newScore = ratingCount <= 0 ? 0 : ratingSum / ratingCount;
            if (newScore > 8) newScore = Math.floor(Math.random() * (6.6 - 4 + 1) + 4);
            console.log({ course: course.name, ratingSum, ratingCount, recalc: newScore });

            await this.CourseModel.updateOne({ _id: course._id }, { score: newScore }).exec();
        }

        return res.end();

        const collection = req.body.collection ? req.body.collection.toString() : "";
        if (!collection) throw new UnprocessableEntityException([{ property: "collection", errors: ["???????????? ???????????? ????????"] }]);

        if (!this.collectionList.includes(collection)) throw new UnprocessableEntityException([{ property: "collection", errors: ["???????????? ???????? ??????????"] }]);

        if (!files.length && !files[0]) throw new UnprocessableEntityException([{ property: "file", errors: ["?????????? ???????? ?????????????? ???????????? ????????"] }]);

        const ogName = files[0].originalname;
        const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);
        // check file size
        if (files[0].size > 524288) throw new UnprocessableEntityException([{ property: "file", errors: ["?????? ???????? ???????? ???????? ???? 500Kb ????????"] }]);
        // check file format
        let isMimeOk = extension == "json";
        if (!isMimeOk) throw new UnprocessableEntityException([{ property: "file", errors: ["???????? ???????? ?????????? ????????"] }]);
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
                await this.import_Courses(json, req);
                break;

            case "Comments":
                await this.import_Comments(json);
                break;
            case "CommissionPayments":
                await this.import_CommissionPayments(json);
                break;
            case "CourseRating":
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
            throw new UnprocessableEntityException([{ property: "importer", errors: ["?????????????? ???? ?????????? ?????????????? ??????????"] }]);
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
            throw new UnprocessableEntityException([{ property: "importer", errors: ["?????????????? ???? ?????????? ?????????????? ??????????"] }]);
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
            throw new UnprocessableEntityException([{ property: "importer", errors: ["?????????????? ???? ?????????? ?????????????? ??????????"] }]);
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
            throw new UnprocessableEntityException([{ property: "importer", errors: ["?????????????? ???? ?????????? ?????????????? ??????????"] }]);
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
            throw new UnprocessableEntityException([{ property: "importer", errors: ["?????????????? ???? ?????????? ?????????????? ??????????"] }]);
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
            throw new UnprocessableEntityException([{ property: "importer", errors: ["?????????????? ???? ?????????? ?????????????? ??????????"] }]);
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
                    // image: `https://porteqali.com/img/teachers/${row.avatar_image}`,
                    image: `/file/public/user_avatars/${row.avatar_image}`,
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
            throw new UnprocessableEntityException([{ property: "importer", errors: ["?????????????? ???? ?????????? ?????????????? ??????????"] }]);
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
            throw new UnprocessableEntityException([{ property: "importer", errors: ["?????????????? ???? ?????????? ?????????????? ??????????"] }]);
        }
    }

    private async import_Users(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                let registeredWith = null;
                const marketer = await this.UserModel.findOne({ mobile: row.registered_with.marketer_phone, role: "marketer" }).exec();
                if (marketer) {
                    registeredWith = { marketer: marketer._id, period: parseInt(row.registered_with.period), endsAt: new Date(row.registered_with.ends_at) };
                }

                imports.push({
                    // image: `https://porteqali.com/img/customers/${row.image}`,
                    image: `/file/public/user_avatars/${row.image}`,
                    name: row.name,
                    family: row.family,
                    email: row.email,
                    emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at) : null,
                    mobile: row.phone || "",
                    mobileVerifiedAt: row.mobile_verified_at ? new Date(row.mobile_verified_at) : null,
                    password: row.password,
                    role: "user",
                    googleId: row.google_id ? row.google_id : "",
                    status: row.ban == "1" ? "deactive" : "active",
                    registeredWith: registeredWith,
                    createdAt: new Date(row.created_at),
                });
            }
            await this.UserModel.insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["?????????????? ???? ?????????? ?????????????? ??????????"] }]);
        }
    }

    private async import_Articles(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];

                let author = null;
                const admin = await this.UserModel.findOne({ email: row.author_email, role: "admin" }).exec();
                if (admin) author = admin._id;
                else {
                    const backupAdmin = await this.UserModel.findOne({ role: "admin" }).exec();
                    author = backupAdmin._id;
                }

                imports.push({
                    author: author,
                    // image: `https://porteqali.com/img/blogs/${row.blog_image}`,
                    image: `/file/public/article_images/${row.blog_image}`,
                    // imageVertical: `https://porteqali.com/img/blogs/${row.blog_image_vertical}`,
                    imageVertical: `/file/public/article_images/${row.blog_image_vertical}`,
                    title: row.title,
                    slug: row.slug,
                    description: row.desc,
                    body: row.text.replaceAll("../../img/blogs/", `/file/public/article_images/`),
                    tags: [],
                    metadata: { thumbnail: `/file/public/article_images/${row.blog_image}`, title: "", description: "", author: "", keywords: "" },
                    status: row.disabled == "1" ? "pending" : "published",
                    likes: 0,
                    publishedAt: new Date(row.created_at),
                    createdAt: new Date(row.created_at),
                });
            }
            await this.ArticleModel.insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["?????????????? ???? ?????????? ?????????????? ??????????"] }]);
        }
    }

    private async import_Courses(json, req) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];

                let teacher = null;
                const teacherResult = await this.UserModel.findOne({ email: row.teacher_email, role: "teacher" }).exec();
                if (teacherResult) teacher = teacherResult._id;

                let courseGroup = null;
                const courseGroupResult = await this.CourseGroupModel.findOne({ name: row.course_group_name }).exec();
                if (courseGroupResult) courseGroup = courseGroupResult._id;

                imports.push({
                    oid: row.id,
                    // image: `https://porteqali.com/img/courses/${row.course_image}`,
                    image: `/file/public/course_images/${row.course_image}`,
                    name: row.name,
                    teacher: teacher,
                    description: row.description,
                    price: row.tuition,
                    // [{ name: "???????? ??????????", file: `https://porteqali.com/course_compress_files/${row.course_compress_file}`, size: "0" }]
                    exerciseFiles: row.course_compress_file
                        ? [{ name: "???????? ??????????", file: `/file/public/course_exercise_files/${row.course_compress_file}`, size: "0" }]
                        : [],
                    groups: [courseGroup],
                    tags: [],
                    status: row.disabled == "1" ? "deactive" : "active",
                    commission: null,
                    buyCount: parseInt(row.buy_count),
                    viewCount: parseInt(row.view_count),
                    score: parseFloat(row.score),
                    showInNew: row.show_in_new == "1" ? true : false,
                    createdAt: new Date(row.created_at),
                });
            }
            await this.CourseModel.insertMany(imports);

            // generating and updating topic
            for (let i = 0; i < json.length; i++) {
                const row = json[i];

                const course = await this.CourseModel.findOne({ oid: row.id }).exec();
                if (!course) continue;

                const topics = [];
                for (let j = 0; j < row.topics.length; j++) {
                    topics.push({
                        order: row.topics[j].order,
                        name: row.topics[j].name,
                        time: {
                            hours: row.topics[j].time.hours,
                            minutes: row.topics[j].time.minutes,
                            seconds: row.topics[j].time.seconds,
                        },
                        description: row.topics[j].description,
                        // file: await this.courseService.generateLinkForTopic(req, row.topics[j].full_link, "courseVideo", { course_id: course._id }),
                        file: `/file/private/course_videos/${course._id}/${row.topics[j].file_name}`,
                        isFree: row.topics[j].is_free == "1" ? true : false,
                        isFreeForUsers: row.topics[j].is_free_for_users == "1" ? true : false,
                        status: "active",
                        // type: "link",
                        type: "file",
                    });
                }

                await this.CourseModel.updateOne({ oid: row.id }, { topics: topics }).exec();
            }
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["?????????????? ???? ?????????? ?????????????? ??????????"] }]);
        }
    }

    private async import_Comments(json) {
        try {
            const admin = await this.UserModel.findOne({ mobile: "09359092003", role: "admin" }).exec();
            for (let i = 0; i < json.length; i++) {
                const row = json[i];

                const course = await this.CourseModel.findOne({ oid: row.course_id }).exec();
                if (!course) continue;

                const user = await this.UserModel.findOne({ email: row.user_email }).exec();
                if (!user) continue;

                const comment = await this.CommentModel.create({
                    user: user._id,
                    commentedOn: "course",
                    commentedOnId: course._id,
                    text: row.comment,
                    status: row.status == "checking" ? "waiting_for_review" : row.status,
                    createdAt: new Date(row.created_at),
                });

                if (!!row.teacher_reply) {
                    const teacher = await this.UserModel.findOne({ email: row.teacher_email, role: "teacher" }).exec();
                    if (teacher) {
                        await this.CommentModel.create({
                            user: teacher._id,
                            commentedOn: "course",
                            commentedOnId: course._id,
                            topComment: comment._id,
                            text: row.teacher_reply,
                            status: "active",
                            createdAt: new Date(row.created_at),
                        });
                    }
                }
                if (!!row.admin_reply) {
                    await this.CommentModel.create({
                        user: admin._id,
                        commentedOn: "course",
                        commentedOnId: course._id,
                        topComment: comment._id,
                        text: row.admin_reply,
                        status: "active",
                        createdAt: new Date(row.created_at),
                    });
                }
            }
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["?????????????? ???? ?????????? ?????????????? ??????????"] }]);
        }
    }

    private async import_CommissionPayments(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];

                const user = await this.UserModel.findOne({ mobile: row.marketer_phone, role: "marketer" }).exec();
                if (!user) continue;

                imports.push({
                    user: user._id,
                    commissionAmountBeforePayment: parseInt(row.wallet_amount_before_payment),
                    payedAmount: parseInt(row.commission_payed_amount),
                    commissionAmountAfterPayment: parseInt(row.wallet_amount_after_payment),
                    cardNumber: row.card_number || "",
                    bank: row.bank || "",
                    createdAt: new Date(row.created_at),
                });
            }
            await this.CommissionPaymentModel.insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["?????????????? ???? ?????????? ?????????????? ??????????"] }]);
        }
    }

    private async import_CourseRatings(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];

                const user = await this.UserModel.findOne({ email: row.user_email.toLowerCase() }).exec();
                if (!user) continue;

                const course = await this.CourseModel.findOne({ oid: parseInt(row.course_id) }).exec();
                if (!course) continue;

                imports.push({ user: user._id, course: course._id, rating: parseInt(row.rating), createdAt: new Date(row.created_at) });
            }
            await this.CourseRatingModel.insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["?????????????? ???? ?????????? ?????????????? ??????????"] }]);
        }
    }

    private async import_MarketerCourses(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];

                const marketer = await this.UserModel.findOne({ mobile: row.marketer_phone, role: "marketer" }).exec();
                if (!marketer) continue;

                const course = await this.CourseModel.findOne({ oid: row.course_id }).exec();
                if (!course) continue;

                const code = `${marketer.marketingCode}${randStr(4)}`;

                imports.push({
                    marketer: marketer._id,
                    course: course._id,
                    commissionAmount: parseInt(row.commission_amount),
                    commissionType: row.commission_type,
                    code: code,
                    status: row.disable == "1" ? "deactive" : "active",
                    createdAt: new Date(row.created_at),
                });
            }
            await this.MarketerCourseModel.insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["?????????????? ???? ?????????? ?????????????? ??????????"] }]);
        }
    }

    private async import_UserCourses(json) {
        try {
            const imports = [];
            for (let i = 0; i < json.length; i++) {
                const row = json[i];

                const user = await this.UserModel.findOne({ email: row.user_email }).select("_id name family").exec();
                if (!user) continue;

                const course = await this.CourseModel.findOne({ oid: row.course_id }).select("_id name price").exec();
                if (!course) continue;

                let authority = "";
                if (row.authority == "0" || row.authority == "---") authority = randStr(10);
                else authority = row.authority;

                let status = "waiting_for_payment";
                switch (row.status) {
                    case "success":
                        status = "ok";
                        break;
                    case "error":
                        status = "error";
                        break;
                    case "canceled":
                        status = "cancel";
                        break;
                }

                let marketer = null;
                let marketer_cut: number = 0;
                if (!!row.marketer_phone) {
                    const marketerResult = await this.UserModel.findOne({ mobile: row.marketer_phone, role: "marketer" }).exec();
                    if (marketerResult) marketer = marketerResult._id;
                    marketer_cut = parseInt(row.marketers_cut);
                }

                imports.push({
                    user: user._id,
                    userFullname: `${user.name} ${user.family}`,
                    course: course._id,
                    courseName: course.name,
                    marketer: marketer,
                    teacherCut: !!row.teachers_cut ? parseInt(row.teachers_cut) : 0,
                    marketerCut: marketer_cut,
                    coursePrice: course.price,
                    coursePayablePrice: parseInt(row.payed_price),
                    totalPrice: parseInt(row.payed_price),
                    paidAmount: parseInt(row.payed_price),
                    transactionCode: row.transaction_code || "",
                    authority: authority,
                    paymentMethod: "zarinpal",
                    status: status,
                    createdAt: new Date(row.created_at),
                });
            }
            await this.UserCourseModel.insertMany(imports);
        } catch (e) {
            console.log(e);
            throw new UnprocessableEntityException([{ property: "importer", errors: ["?????????????? ???? ?????????? ?????????????? ??????????"] }]);
        }
    }
}
