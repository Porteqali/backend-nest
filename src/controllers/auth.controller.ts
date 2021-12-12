import { Body, Controller, ForbiddenException, Get, Post, Req, Res, UnauthorizedException, UnprocessableEntityException, UseGuards } from "@nestjs/common";
import { Response } from "express";
import * as moment from "moment";
import { readFile } from "fs/promises";
import { hash } from "bcrypt";
import { Request } from "src/interfaces/Request";
import { RegisterDto } from "src/dto/auth/register.dto";
import { AuthService } from "src/services/auth.service";
import { LoginDto } from "src/dto/auth/login.dto";
import { SendCodeDto } from "src/dto/auth/sendCode.dto";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserDocument } from "src/models/users.schema";
import Email from "src/notifications/channels/Email";
import Sms from "src/notifications/channels/Sms";
import { VerifyDto } from "src/dto/auth/verify.dto";

@Controller("auth")
export class AuthController {
    private tokenExpireTime = 3600 * 24 * 7; // 1 week
    private verficationCodeExpireTime = 120; // 2 minutes

    constructor(private readonly authService: AuthService, @InjectModel("User") private readonly UserModel: Model<UserDocument>) {}

    @Post("send-code")
    public async sendCode(@Body() inputs: SendCodeDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        let field = "mobile";
        let verificationCodeField = "mobileVerificationCode";
        const isEmail = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g.test(inputs.username);
        if (isEmail) {
            field = "email";
            verificationCodeField = "emailVerificationCode";
        }

        const user = await this.UserModel.findOne({ [field]: inputs.username }).exec();
        if (user) {
            if (!!user.mobileVerifiedAt || !!user.emailVerifiedAt) {
                if (user.name != "" && user.family != "") {
                    // user already exists
                    throw new ForbiddenException([{ property: "username", errors: ["ایمیل یا شماره همراه قبلا ثبت شده"] }]);
                }
            }
            // check the time of last email or sms sent
            if (!!user.verficationCodeSentAt) {
                let sendTime = moment(user.verficationCodeSentAt);
                let duration = moment.duration(moment(new Date()).diff(sendTime));
                if (duration.asSeconds() < this.verficationCodeExpireTime) return res.json({ expireIn: this.verficationCodeExpireTime - duration.asSeconds() });
            }
        }

        // generate a 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000);

        // if the user does not exists before create the user
        await this.UserModel.updateOne({ [field]: inputs.username }, { [verificationCodeField]: code.toString() }, { upsert: true }).exec();

        if (field == "email") {
            let html = await readFile("./src/notifications/templates/verficationEmail.html").then((buffer) => buffer.toString());
            html = html.replace(/{{url}}/g, req.headers.origin);
            html = html.replace("{{code}}", code.toString());
            await Email(`کد تایید ${code} | گروه آموزشی پرتقال`, inputs.username, html)
                .then(async () => await this.UserModel.updateOne({ email: inputs.username }, { verficationCodeSentAt: new Date(Date.now()) }).exec())
                .catch((e) => console.log(e));
        } else {
            await Sms("verify", inputs.username, null, [code.toString()], "porteqal")
                .then(async () => await this.UserModel.updateOne({ mobile: inputs.username }, { verficationCodeSentAt: new Date(Date.now()) }).exec())
                .catch((e) => console.log(e));
        }

        return res.json({ expireIn: this.verficationCodeExpireTime });
    }

    @Post("verify")
    public async verfication(@Body() inputs: VerifyDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        let field = "mobile";
        let verifiedAtField = "mobileVerifiedAt";
        let verificationCodeField = "mobileVerificationCode";
        const isEmail = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g.test(inputs.username);
        if (isEmail) {
            field = "email";
            verifiedAtField = "emailVerifiedAt";
            verificationCodeField = "emailVerificationCode";
        }

        const user = await this.UserModel.findOne({ [field]: inputs.username, [verificationCodeField]: inputs.code }).exec();
        if (!user) throw new UnprocessableEntityException([{ property: "code", errors: ["کد وارد شده نادرست است"] }]);

        // check the time with verficationCodeSentAt field
        let sendTime = moment(user.verficationCodeSentAt);
        let duration = moment.duration(moment(new Date()).diff(sendTime));
        if (duration.asSeconds() > this.verficationCodeExpireTime) {
            throw new UnprocessableEntityException([{ property: "code", errors: ["کد وارد شده منقضی شده، لطفا دوباره تلاش کنید"] }]);
        }

        await this.UserModel.updateOne({ [field]: inputs.username, [verificationCodeField]: inputs.code }, { [verifiedAtField]: new Date(Date.now()) }).exec();

        // check if the name and family field is full
        if (!user.name || !user.family) {
            return res.json({ register: true });
        }

        // generate token
        req.user = user.id;
        const sessionId = await this.authService.getSession(req);
        const token = this.authService.generateToken(req, sessionId);

        return res.json({ token, user: req.user, register: false });
    }

    @Post("register")
    async register(@Body() inputs: RegisterDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        let field = "mobile";
        let verificationCodeField = "mobileVerificationCode";
        const isEmail = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g.test(inputs.username);
        if (isEmail) {
            field = "email";
            verificationCodeField = "emailVerificationCode";
        }

        if (inputs.password !== inputs.passwordConfirmation) {
            throw new UnauthorizedException([{ property: "password", errors: ["رمزعبورها باهم همخوانی ندارند"] }]);
        }

        const user = await this.UserModel.findOne({ [field]: inputs.username, [verificationCodeField]: inputs.code }).exec();
        if (!user) throw new UnauthorizedException([{ property: "", errors: ["کاربر پیدا نشد"] }]);

        // update user's info and set status to active
        await this.UserModel.updateOne(
            { [field]: inputs.username, [verificationCodeField]: inputs.code },
            { name: inputs.name, family: inputs.family, password: await hash(inputs.password, 5), status: "active" },
        ).exec();

        // generate token and session
        req.user = user.id;
        const sessionId = await this.authService.getSession(req);
        const token = this.authService.generateToken(req, sessionId);

        // res.cookie("AuthToken", token, { sameSite: "strict", path: "/", httpOnly: true, secure: true, maxAge: this.tokenExpireTime * 1000 });
        return res.json({ token, user: req.user });
    }

    @Post("login")
    async login(@Body() credentials: LoginDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        let field = "mobile";
        const isEmail = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g.test(credentials.username);
        if (isEmail) field = "email";

        const user = await this.authService.authenticate(field, credentials.username, credentials.password);
        if (user && user.status != "active") {
            throw new ForbiddenException([{ property: "", errors: ["امکان ورود برای شما وجود ندارد"] }]);
        }
        req.user = user.id;

        // create a session
        const sessionId = await this.authService.getSession(req);
        // generate token
        const token = this.authService.generateToken(req, sessionId);
        // res.cookie("AuthToken", token, { sameSite: "strict", path: "/", httpOnly: true, secure: true, maxAge: this.tokenExpireTime * 1000 });
        return res.json({ token, user: req.user });
    }

    @Get("login/continue-with-google")
    async continueWithGoogle(@Req() req: Request) {
        // TODO
        // nuxt will call this when user succesfuly logged with google
        // here we should check if user exist or not then base on that, we should generate a token and returned it
    }

    @Post("refresh")
    async refresh(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        req.user = req.user["payload"].user_id;
        // update the session
        const sessionId = await this.authService.getSession(req);
        // generate new token
        const token = this.authService.generateToken(req, sessionId);
        // res.cookie("AuthToken", token, { sameSite: "strict", path: "/", httpOnly: true, secure: true, maxAge: this.tokenExpireTime * 1000 });
        return res.json({ token, user: req.user });
    }

    @Post("logout")
    async logout(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        // TODO
        req.user = req.user["payload"].user_id;
        return res.end();
    }
}
