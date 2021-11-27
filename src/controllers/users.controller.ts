import { Controller, Get, ImATeapotException, NotAcceptableException, NotFoundException, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { PermissionDocument } from "src/models/permissions.schema";
import { RoleDocument } from "src/models/permissionGroups.schema";
import { UserDocument } from "src/models/users.schema";

@Controller("users")
export class UsersController {
    constructor(
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("Role") private readonly RoleModel: Model<RoleDocument>,
        @InjectModel("Permission") private readonly PermissionModel: Model<PermissionDocument>,
    ) {}

    @Get("info")
    async getUser(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        const user = await this.UserModel.findOne({ _id: req.user["payload"].user_id })
            .select("-_v -password -createdAt")
            .populate("role", "-_id name permissions")
            .exec();
        if (!user) throw NotFoundException;

        return res.json(user);
    }
}
