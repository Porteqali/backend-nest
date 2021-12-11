import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Response } from "express";
import { Request } from "src/interfaces/Request";
import { RegisterDto } from "src/dto/register.dto";
import { AuthService } from "src/services/auth.service";
import { LoginDto } from "src/dto/login.dto";

@Controller("auth")
export class AuthController {
    private tokenExpireTime = 3600 * 24 * 7; // 1 week

    constructor(private readonly authService: AuthService) {}

    @Post("register")
    async register(@Body() inputs: RegisterDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const user = await this.authService.addUser(inputs);
        req.user = user.id;

        // generate token and session
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
        req.user = user.id;

        // create a session
        const sessionId = await this.authService.getSession(req);
        // generate token
        const token = this.authService.generateToken(req, sessionId);
        // res.cookie("AuthToken", token, { sameSite: "strict", path: "/", httpOnly: true, secure: true, maxAge: this.tokenExpireTime * 1000 });
        return res.json({ token, user: req.user });
    }

    @Get("login/google")
    // @UseGuards(AuthGuard("userGoogleLogin"))
    async googleLogin(@Req() req: Request) {
        // TODO
        // nuxt will call this when user succesfuly logged with google
        // here we should generate a token and returned it
    }

    // @Get("login/google/callback")
    // @UseGuards(AuthGuard("userGoogleLogin"))
    // async googleLoginCallback(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
    //     if (!req.user) throw new UnauthorizedException();

    //     // create a session
    //     const sessionId = await this.authService.getSession(req);
    //     // generate token
    //     const token = this.authService.generateToken(req, sessionId);
    //     // res.cookie("AuthToken", token, { sameSite: "strict", path: "/", httpOnly: true, secure: true, maxAge: this.tokenExpireTime * 1000 });
    //     return res.json({ token, user: req.user });
    // }

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
