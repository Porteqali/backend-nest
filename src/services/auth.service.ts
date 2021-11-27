import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { compare, hash } from "bcrypt";
import { sign } from "jsonwebtoken";
import { Request } from "src/interfaces/Request";
import { Model } from "mongoose";
import { SessionDocument } from "src/models/sessions.schema";
import { UserDocument } from "src/models/users.schema";
import { RegisterDto } from "src/dto/register.dto";

@Injectable()
export class AuthService {
    private sessionExpireTime = 60 * 15; //15 minutes

    constructor(
        @InjectModel("Session") private readonly SessionModel: Model<SessionDocument>,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
    ) {}

    generateToken(req: Request, sessionId): string {
        const payload = {
            session_id: sessionId,
            user_id: req.user,
            ip_addr: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
            user_agent: req.headers["user-agent"],
        };
        return sign(payload, process.env.JWT_SECRET);
    }

    async getSession(req: Request) {
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

        await this.SessionModel.updateOne(
            { user: req.user, userAgent: req.headers["user-agent"], ip: ip },
            { expireAt: new Date(Date.now() + this.sessionExpireTime * 1000), updatedAt: new Date(Date.now()) },
            { upsert: true },
        );

        const session = await this.SessionModel.findOne({ user: req.user, userAgent: req.headers["user-agent"], ip: ip });
        return session.id;
    }

    async addUser(inputs: RegisterDto): Promise<UserDocument> {
        // check if email is unique
        const user = await this.UserModel.findOne({ email: inputs.email }).exec();
        if (user) throw new BadRequestException("Email already exists");

        const role = await this.UserModel.findOne({ name: "user" }).exec();
        const newUser = await this.UserModel.create({
            name: inputs.name,
            family: inputs.family,
            email: inputs.email,
            password: await hash(inputs.password, 5),
            status: "active",
            role: role.id,
        });

        return newUser;
    }

    async authenticate(username: string, password: string) {
        const user = await this.UserModel.findOne({ email: username });
        if (!user) throw new UnauthorizedException("نام کاربری یا رمزعبور نادرست است");

        const passOk = await compare(password, user.password);
        if (!passOk) throw new UnauthorizedException("نام کاربری یا رمزعبور نادرست است");
    }

    async authorize(req: Request, role: string, permissions: string[] = []) {
        // check the role
        if (req.user["user"].role.name !== role) return false;

        // check the permission list
        for (let i = 0; i < permissions.length; i++) {
            if (!req.user["user"].role.permissions.includes(permissions[i])) return false;
        }
        
        return true;
    }
}
