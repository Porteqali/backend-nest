import { Body, Controller, ForbiddenException, Get, Post, Req, Res, UnauthorizedException, UnprocessableEntityException, UseGuards } from "@nestjs/common";
import { Response } from "express";
import * as moment from "moment";
import { readFile } from "fs/promises";
import { hash } from "bcrypt";
import { Request } from "src/interfaces/Request";
import { ForgetPassDto } from "src/dto/auth/register.dto";
import { AuthService } from "src/services/auth.service";
import { SendCodeDto } from "src/dto/auth/sendCode.dto";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import Email from "src/notifications/channels/Email";
import Sms from "src/notifications/channels/Sms";
import { VerifyDto } from "src/dto/auth/verify.dto";
import { AnalyticsService } from "src/services/analytics.service";

@Controller("auth/forget-password")
export class ForgetPassowrdController {
    // private tokenExpireTime = 3600 * 24 * 7; // 1 week
    private verficationCodeExpireTime = 120; // 2 minutes

    constructor(
        private readonly authService: AuthService,
        private readonly analyticsService: AnalyticsService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
    ) {}

    @Post("send-code")
    public async sendCode(@Body() inputs: SendCodeDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        console.log(1);
        
        let field = "mobile";
        const isEmail = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g.test(inputs.username);
        if (isEmail) field = "email";

        const user = await this.UserModel.findOne({ [field]: inputs.username }).exec();
        if (!user) throw new ForbiddenException([{ property: "username", errors: ["کاربر در سیستم پیدا نشد"] }]);

        if (user.status != "active") throw new ForbiddenException([{ property: "username", errors: ["امکان بازیابی رمزعبور برای شما وجود ندارد"] }]);

        // check the time of last email or sms sent
        if (!!user.forgetPasswordCodeSentAt) {
            let sendTime = moment(user.forgetPasswordCodeSentAt);
            let duration = moment.duration(moment(new Date()).diff(sendTime));
            if (duration.asSeconds() < this.verficationCodeExpireTime) return res.json({ expireIn: this.verficationCodeExpireTime - duration.asSeconds() });
        }

        // generate a 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000);

        // if the user does not exists before create the user
        await this.UserModel.updateOne({ [field]: inputs.username }, { forgetPasswordCode: code.toString() }).exec();

        if (field == "email") {
            let html = await readFile("./src/notifications/templates/verficationEmail.html").then((buffer) => buffer.toString());
            html = html.replace(/{{url}}/g, req.headers.origin);
            html = html.replace("{{code}}", code.toString());
            await Email(`کد تایید ${code} | گروه آموزشی پرتقال`, inputs.username, html)
                .then(async () => await this.UserModel.updateOne({ email: inputs.username }, { forgetPasswordCodeSentAt: new Date(Date.now()) }).exec())
                .catch((e) => console.log(e));
        } else {
            await Sms("verify", inputs.username, null, [code.toString()], "porteqal")
                .then(async () => await this.UserModel.updateOne({ mobile: inputs.username }, { forgetPasswordCodeSentAt: new Date(Date.now()) }).exec())
                .catch((e) => console.log(e));
        }

        return res.json({ expireIn: this.verficationCodeExpireTime });
    }

    @Post("verify")
    public async verfication(@Body() inputs: VerifyDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        let field = "mobile";
        const isEmail = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g.test(inputs.username);
        if (isEmail) field = "email";

        const user = await this.UserModel.findOne({ [field]: inputs.username, forgetPasswordCode: inputs.code }).exec();
        if (!user) throw new UnprocessableEntityException([{ property: "code", errors: ["کد وارد شده نادرست است"] }]);

        // check the time with forgetPasswordCodeSentAt field
        let sendTime = moment(user.forgetPasswordCodeSentAt);
        let duration = moment.duration(moment(new Date()).diff(sendTime));
        if (duration.asSeconds() > this.verficationCodeExpireTime) {
            throw new UnprocessableEntityException([{ property: "code", errors: ["کد وارد شده منقضی شده، لطفا دوباره تلاش کنید"] }]);
        }

        return res.end();
    }

    @Post("change-password")
    async changePassword(@Body() inputs: ForgetPassDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        let field = "mobile";
        const isEmail = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g.test(inputs.username);
        if (isEmail) field = "email";

        if (inputs.password !== inputs.passwordConfirmation) {
            throw new UnauthorizedException([{ property: "password", errors: ["رمزعبورها باهم همخوانی ندارند"] }]);
        }

        const user = await this.UserModel.findOne({ [field]: inputs.username, forgetPasswordCode: inputs.code }).exec();
        if (!user) throw new UnauthorizedException([{ property: "", errors: ["کاربر پیدا نشد"] }]);

        // update user's info and set status to active
        await this.UserModel.updateOne(
            { [field]: inputs.username, forgetPasswordCode: inputs.code },
            { forgetPasswordCode: null, password: await hash(inputs.password, 5) },
        ).exec();

        return res.end();
    }
}
