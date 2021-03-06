import { All, Body, Controller, Delete, Get, Post, Req, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { PermissionDocument } from "src/models/permissions.schema";
import { PermissionGroupDocument } from "src/models/permissionGroups.schema";
import { UserDocument } from "src/models/users.schema";
import { EditUserInfoDto } from "src/dto/editUserInfo.dto";
import { randStr } from "src/helpers/str.helper";
import * as moment from "moment";
import * as sharp from "sharp";
import { unlink, readFile } from "fs/promises";
import { FilesInterceptor } from "@nestjs/platform-express";
import { SendCodeDto } from "src/dto/auth/sendCode.dto";
import { VerifyDto } from "src/dto/auth/verify.dto";
import Email from "src/notifications/channels/Email";
import Sms from "src/notifications/channels/Sms";

@Controller("users")
export class UsersController {
    private verficationCodeExpireTime = 120; // 2 minutes

    constructor(
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("PermissionGroup") private readonly PermissionGroupModel: Model<PermissionGroupDocument>,
        @InjectModel("Permission") private readonly PermissionModel: Model<PermissionDocument>,
    ) {}

    @Post("info")
    async getUser(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const user = await this.UserModel.findOne({ _id: req.user["payload"].user_id })
            .select("-_v -password -createdAt")
            .populate("permissionGroup", "-_id name permissions")
            .exec();
        if (!user) throw NotFoundException;

        const permissions = new Set();
        if (!!user.permissions) user.permissions.forEach((permission) => permissions.add(permission));
        if (!!user.permissionGroup) user.permissionGroup.permissions.forEach((permission) => permissions.add(permission));

        return res.json({
            image: user.image,
            name: user.name,
            family: user.family,
            email: user.email,
            mobile: user.mobile,
            role: user.role,
            wallet: user.walletBalance,
            permissions: [...permissions],
        });
    }

    @Get("check-verification")
    async checkVerification(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const user = await this.UserModel.findOne({ _id: req.user["payload"].user_id }).select("-_v -password -createdAt").exec();
        if (!user) throw NotFoundException;

        return res.json({
            emailVerified: !!user.emailVerifiedAt,
            mobileVerified: !!user.mobileVerifiedAt,
        });
    }

    @Post("edit-info")
    async editUserInfo(@Body() input: EditUserInfoDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const user = await this.UserModel.findOne({ _id: req.user["payload"].user_id }).exec();
        if (!user) throw new NotFoundException([{ property: "user", errors: ["?????????? ???????? ??????"] }]);

        await this.UserModel.updateOne({ _id: req.user["payload"].user_id }, { name: input.name, family: input.family });

        return res.json();
    }

    @Post("edit-avatar-image")
    @UseInterceptors(FilesInterceptor("files"))
    async editUserImage(@UploadedFiles() files: Array<Express.Multer.File>, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const user = await this.UserModel.findOne({ _id: req.user["payload"].user_id }).exec();
        if (!user) throw new NotFoundException([{ property: "user", errors: ["?????????? ???????? ??????"] }]);

        if (!!files.length) {
            const ogName = files[0].originalname;
            const extension = ogName.slice(((ogName.lastIndexOf(".") - 1) >>> 0) + 2);

            // check file size
            if (files[0].size > 2097152) throw new UnprocessableEntityException([{ property: "image", errors: ["?????? ???????? ???????? ???????? ???? 2Mb ????????"] }]);

            // check file format
            let isMimeOk = extension == "png" || extension == "gif" || extension == "jpeg" || extension == "jpg";
            if (!isMimeOk) throw new UnprocessableEntityException([{ property: "image", errors: ["???????? ???????? ?????????? ????????"] }]);

            // delete the old image from system
            if (!!user.image) await unlink(user.image.replace("/file/", "storage/")).catch((e) => {});

            const randName = randStr(10);
            const img = sharp(Buffer.from(files[0].buffer));
            img.resize(256);
            const url = `storage/public/user_avatars/${randName}.${extension}`;
            await img.toFile(url).catch((e) => console.log(e));

            const imageLink = url.replace("storage/", "/file/");
            await this.UserModel.updateOne({ _id: req.user["payload"].user_id }, { image: imageLink });

            return res.json({ imageLink });
        }

        return res.json({ imageLink: user.image });
    }

    @Delete("delete-avatar-image")
    async deleteUserImage(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const user = await this.UserModel.findOne({ _id: req.user["payload"].user_id }).select("-_v -password -createdAt").exec();
        if (!user) throw new NotFoundException([{ property: "user", errors: ["?????????? ???????? ??????"] }]);

        // delete the old image from system
        if (!!user.image) await unlink(user.image.replace("/file/", "storage/")).catch((e) => {});
        // delete image form db
        await this.UserModel.updateOne({ _id: req.user["payload"].user_id }, { image: "" });

        return res.json();
    }

    @Post("send-verification-code")
    async sendVerificationCode(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        let errMsg = "";
        let field = req.body.type || "mobile";
        if (!req.body.username) {
            if (field == "email") errMsg = "?????????? ?????? ???? ???????? ????????";
            else errMsg = "?????????? ?????????? ?????? ???? ???????? ????????";
            throw new ForbiddenException([{ property: "username", errors: [errMsg] }]);
        }

        let verifiedAtField = "mobileVerifiedAt";
        let verificationCodeField = "mobileVerificationCode";
        const isEmail = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g.test(req.body.username);
        if (isEmail) {
            field = "email";
            verifiedAtField = "emailVerifiedAt";
            verificationCodeField = "emailVerificationCode";
        }

        // check if email or mobile is unique
        const user = await this.UserModel.findOne({ [field]: req.body.username }).exec();
        if (user) {
            if (user._id.toString() != req.user["payload"].user_id) {
                if (field == "email") errMsg = "?????????? ???????? ?????? ??????";
                else errMsg = "?????????? ?????????? ???????? ?????? ??????";
                throw new ForbiddenException([{ property: "username", errors: [errMsg] }]);
            } else {
                if (field == "email" && !!user.emailVerifiedAt) {
                    throw new ForbiddenException([{ property: "username", errors: ["?????????? ?????????? ??????"] }]);
                }
                if (field == "mobile" && !!user.mobileVerifiedAt) {
                    throw new ForbiddenException([{ property: "username", errors: ["?????????? ?????????? ?????????? ??????"] }]);
                }
                if (!!user.verficationCodeSentAt) {
                    let sendTime = moment(user.verficationCodeSentAt);
                    let duration = moment.duration(moment(new Date()).diff(sendTime));
                    if (duration.asSeconds() < this.verficationCodeExpireTime) return res.json({ expireIn: this.verficationCodeExpireTime - duration.asSeconds() });
                }
            }
        }

        // generate a 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000);

        // if email or mobile is not in the system then update user with new data
        await this.UserModel.updateOne(
            { _id: req.user["payload"].user_id },
            { [field]: req.body.username, [verificationCodeField]: code.toString(), [verifiedAtField]: null },
        ).exec();

        if (field == "email") {
            let html = await readFile("./src/notifications/templates/verficationEmail.html").then((buffer) => buffer.toString());
            html = html.replace(/{{url}}/g, req.headers.origin);
            html = html.replace("{{code}}", code.toString());
            await Email(`???? ?????????? ${code} | ???????? ???????????? ????????????`, req.body.username, html)
                .then(async () => await this.UserModel.updateOne({ email: req.body.username }, { verficationCodeSentAt: new Date(Date.now()) }).exec())
                .catch((e) => console.log(e));
        } else {
            await Sms("verify", req.body.username, null, [code.toString()], "porteqal")
                .then(async () => await this.UserModel.updateOne({ mobile: req.body.username }, { verficationCodeSentAt: new Date(Date.now()) }).exec())
                .catch((e) => console.log(e));
        }

        return res.json({ expireIn: this.verficationCodeExpireTime });
    }

    @Post("verify")
    async verify(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        let errMsg = "";
        let field = req.body.type || "mobile";
        if (!req.body.username) {
            errMsg = field == "email" ? "?????????? ?????????? ?????? ???? ???????? ????????" : "?????????? ?????? ???? ???????? ????????";
            throw new ForbiddenException([{ property: "username", errors: [errMsg] }]);
        }

        let verifiedAtField = "mobileVerifiedAt";
        let verificationCodeField = "mobileVerificationCode";
        const isEmail = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g.test(req.body.username);
        if (isEmail) {
            field = "email";
            verifiedAtField = "emailVerifiedAt";
            verificationCodeField = "emailVerificationCode";
        }

        const user = await this.UserModel.findOne({ _id: req.user["payload"].user_id, [field]: req.body.username, [verificationCodeField]: req.body.code }).exec();
        if (!user) throw new UnprocessableEntityException([{ property: "code", errors: ["???? ???????? ?????? ???????????? ??????"] }]);

        // check the time with verficationCodeSentAt field
        let sendTime = moment(user.verficationCodeSentAt);
        let duration = moment.duration(moment(new Date()).diff(sendTime));
        if (duration.asSeconds() > this.verficationCodeExpireTime) {
            throw new UnprocessableEntityException([{ property: "code", errors: ["???? ???????? ?????? ?????????? ???????? ???????? ???????????? ???????? ????????"] }]);
        }

        await this.UserModel.updateOne({ _id: req.user["payload"].user_id }, { [verifiedAtField]: new Date(Date.now()) }).exec();

        return res.json({});
    }
}
