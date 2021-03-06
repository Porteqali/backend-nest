import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { compare, hash } from "bcrypt";
import { sign } from "jsonwebtoken";
import { Request } from "src/interfaces/Request";
import { Model } from "mongoose";
import { SessionDocument } from "src/models/sessions.schema";
import { UserDocument } from "src/models/users.schema";
import { AnalyticsService } from "./analytics.service";
import * as moment from "moment";

@Injectable()
export class AuthService {
    constructor(
        private readonly analyticsService: AnalyticsService,
        @InjectModel("Session") private readonly SessionModel: Model<SessionDocument>,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
    ) {}

    generateToken(req: Request, sessionId): string {
        const payload = {
            session_id: sessionId,
            user_id: req.user,
            ip_addr: req.headers.ipaddr || req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
            user_agent: req.headers["user-agent"],
        };
        return sign(payload, process.env.JWT_SECRET);
    }

    async getSession(req: Request) {
        const ip = req.headers.ipaddr || req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

        await this.SessionModel.updateOne(
            { user: req.user, userAgent: req.headers["user-agent"], ip: ip },
            { expireAt: new Date(Date.now() + parseInt(process.env.SESSION_EXPIRE_TIME) * 1000), updatedAt: new Date(Date.now()) },
            { upsert: true },
        );

        const session = await this.SessionModel.findOne({ user: req.user, userAgent: req.headers["user-agent"], ip: ip });
        return session.id;
    }

    async authenticate(username_field: string = "email", username: string, password: string) {
        const user = await this.UserModel.findOne({ [username_field]: username }).exec();
        if (!user) throw new UnauthorizedException([{ property: "", errors: ["نام کاربری یا رمزعبور نادرست است"] }]);

        let hash = user.password.replace(/^\$2y(.+)$/i, "$2a$1"); // modification regex
        const passOk = await compare(password, hash);
        if (!passOk) throw new UnauthorizedException([{ property: "", errors: ["نام کاربری یا رمزعبور نادرست است"] }]);

        return user;
    }

    async authorize(req: Request, role: string, permissionsToCheck: string[] = [], style: "OR" | "AND" = "OR") {
        // check the role
        if (req.user.user.role !== role) return false;

        // get the user
        const user = await this.UserModel.findOne({ _id: req.user["payload"].user_id })
            .select("-_v -password -createdAt")
            .populate("permissionGroup", "-_id name permissions")
            .exec();
        if (!user) return false;

        // list the user's permissions base on both permissionGroup and permissions
        const userPermissionsSet = new Set();
        if (!!user.permissions) user.permissions.forEach((permission) => userPermissionsSet.add(permission));
        if (!!user.permissionGroup) user.permissionGroup.permissions.forEach((permission) => userPermissionsSet.add(permission));
        const userPermissions = [...userPermissionsSet];

        // then check the requested permission list agains it
        if (style == "AND") {
            for (let i = 0; i < permissionsToCheck.length; i++) if (userPermissions.indexOf(permissionsToCheck[i]) == -1) return false;
            return true;
        } else {
            for (let i = 0; i < permissionsToCheck.length; i++) if (userPermissions.indexOf(permissionsToCheck[i]) != -1) return true;
            return false;
        }

        return false;
    }

    async registerUserForMarketer(req: Request, userId) {
        const marketingCode = req.cookies["marketing_code"] || "";
        if (!marketingCode) return;

        const marketer = await this.UserModel.findOne({ marketingCode: marketingCode, role: "marketer" }).exec();
        if (!marketer) return;

        const endsAt = moment().add(marketer.period, "days").toDate();
        await this.UserModel.updateOne({ _id: userId }, { registeredWith: { marketer: marketer._id, period: marketer.period, endsAt: endsAt } }).exec();

        await this.analyticsService.analyticCountUp(req, marketer._id, null, 1, "new-users", "marketer");
    }
}
