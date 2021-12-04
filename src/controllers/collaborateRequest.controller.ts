import { Body, Controller, Get, ImATeapotException, NotAcceptableException, NotFoundException, Post, Req, Res } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CollaborateRequestDocument } from "src/models/collaborateRequests.schema";
import { SendCollaborateRequestDto } from "src/dto/collaborateRequest.dto";

@Controller("collaborate-request")
export class CollaborateRequestController {
    constructor(@InjectModel("CollaborateRequest") private readonly CollaborateRequestModel: Model<CollaborateRequestDocument>) {}

    @Post("/")
    async sendCollaborateRequest(@Body() input: SendCollaborateRequestDto, @Req() req: Request, @Res() res: Response): Promise<void | Response> {
        await this.CollaborateRequestModel.create({
            name: input.name,
            family: input.family,
            mobile: input.mobile,
            email: input.email,
            suggestiveRole: input.issue,
            description: input.text,
        });
        return res.json({});
    }
}
