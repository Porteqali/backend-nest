import { ForbiddenException, Injectable, NestMiddleware, Req, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Response, NextFunction } from "express";
import { Request } from "src/interfaces/Request";
import { verify } from "jsonwebtoken";
import { Model } from "mongoose";
import { SessionDocument } from "src/models/sessions.schema";
import { UserDocument } from "src/models/users.schema";

/*
    Making sure the user is logged in
*/
@Injectable()
export class AuthCheckMiddleware implements NestMiddleware {
    constructor(
        @InjectModel("Session") private readonly SessionModel: Model<SessionDocument>,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
    ) {}

    async use(req: Request, res: Response, next: NextFunction) {
        let token = "";
        if (req.headers["authtoken"]) token = req.headers["authtoken"].toString();
        if (req.cookies["AuthToken"]) token = req.cookies["AuthToken"].toString();

        if (token === null || token === "") throw new UnauthorizedException(-1);

        const payload = verify(token, process.env.JWT_SECRET);
        if (typeof payload["user_id"] !== "undefined") {
            // get the session
            const session = await this.SessionModel.findOne({ _id: payload["session_id"] });
            if (!session) throw new UnauthorizedException(-2);

            // TODO
            // check the request user-agent and ip with the session record and payload

            // check if session is expired
            if (payload["iat"] * 1000 < Date.now() - parseInt(process.env.SESSION_EXPIRE_TIME) * 1000) throw new UnauthorizedException(-3);

            const user = await this.UserModel.findOne({ _id: payload["user_id"] }).exec();
            if (!user) throw new UnauthorizedException(-4);

            req.user = { payload, user };

            return next();
        }

        throw new UnauthorizedException(-5);
    }
}

/*
    Making sure no user is logged in
*/
@Injectable()
export class GuestMiddleware implements NestMiddleware {
    constructor(@InjectModel("Session") private readonly SessionModel: Model<SessionDocument>) {}

    async use(req: Request, res: Response, next: NextFunction) {
        let token = "";
        if (req.headers["authtoken"]) token = req.headers["authtoken"].toString();
        if (req.cookies["AuthToken"]) token = req.cookies["AuthToken"].toString();

        if (token === null || token === "") return next();

        const payload = verify(token, process.env.JWT_SECRET);
        if (typeof payload["user_id"] === "undefined") return next();

        // get the session
        const session = await this.SessionModel.findOne({ _id: payload["session_id"] });
        if (!session) return next();

        // check if session is expired
        // if (new Date(payload["iat"] * 1000) >= session.expireAt) return next();
        if (payload["iat"] * 1000 < Date.now() - parseInt(process.env.SESSION_EXPIRE_TIME) * 1000) return next();

        throw new ForbiddenException();
    }
}
