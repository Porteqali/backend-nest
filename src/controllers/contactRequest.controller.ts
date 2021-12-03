import { Body, Controller, Get, ImATeapotException, NotAcceptableException, NotFoundException, Post, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ContactRequestDocument } from "src/models/contactRequests.schema";
import { SendContactRequestDto } from "src/dto/contactRequest.dto";

@Controller("contact-request")
export class ContactRequestController {
    constructor(@InjectModel("ContactRequest") private readonly ContactRequestModel: Model<ContactRequestDocument>) {}

    @Post("/")
    async getUser(@Body() input: SendContactRequestDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        await this.ContactRequestModel.create({
            name: input.name,
            family: input.family,
            mobile: input.mobile,
            email: input.email,
            issue: input.issue,
            message: input.text,
        });
        return res.json({});
    }
}
