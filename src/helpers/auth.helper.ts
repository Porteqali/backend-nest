import { Request } from "src/interfaces/Request";
import { verify } from "jsonwebtoken";
import { connect, model } from "mongoose";
import { SessionDocument, SessionSchema } from "src/models/sessions.schema";
import { UserDocument, UserSchema } from "src/models/users.schema";

interface user {
    user: UserDocument;
    payload: {
        session_id: string;
        user_id: string;
        ip_addr: string | string[];
        user_agent: string;
    };
}

const sessionExpireTime = parseInt(process.env.SESSION_EXPIRE_TIME); //15 minutes

const UserModel = model<UserDocument>("users", UserSchema);
const SessionModel = model<SessionDocument>("sessions", SessionSchema);

export const loadUser = async (req: Request): Promise<null | user> => {
    await connect(process.env.MONGO_URL, { dbName: "porteqali2" });

    let token = "";
    if (req.headers["authtoken"]) token = req.headers["authtoken"].toString();
    if (req.cookies["AuthToken"]) token = req.cookies["AuthToken"].toString();

    if (token === null || token === "") return null;

    const payload = verify(token, process.env.JWT_SECRET);
    if (typeof payload["user_id"] !== "undefined") {
        // get the session
        const session = await SessionModel.findOne({ _id: payload["session_id"] }).exec();
        if (!session) return null;

        // TODO
        // check the request user-agent and ip with the session record and payload

        // check if session is expired
        if (payload["iat"] * 1000 < Date.now() - sessionExpireTime * 1000) return null;

        const user = await UserModel.findOne({ _id: payload["user_id"] }).exec();
        if (!user) return null;

        return { user: user, payload };
    }

    return null;
};
