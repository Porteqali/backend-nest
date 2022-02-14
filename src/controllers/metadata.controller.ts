import { Body, Controller, Get, Post, Req, Res, UnprocessableEntityException } from "@nestjs/common";
import { Request as exRequest, Response } from "express";
import { Request } from "src/interfaces/Request";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { MetadataDocument } from "src/models/metadatas.schema";

@Controller("metadata")
export class MetadataController {
    constructor(@InjectModel("Metadata") private readonly MetadataModel: Model<MetadataDocument>) {}

    @Get("/:page")
    async getMetadataForPage(@Req() req: Request, @Res() res: Response): Promise<void | Response> {
        // find the page inside the db and get its metadata
        let metadata = await this.MetadataModel.findOne({ page: req.params.page }).exec();
        if (!metadata) metadata = await this.MetadataModel.findOne({ page: "home" }).exec();

        return res.json({
            title: metadata.title,
            meta: [
                { hid: "description", name: "description", content: metadata.description },
                { hid: "language", name: "language", content: metadata.language },
                { hid: "keywords", name: "keywords", content: metadata.keywords },

                { hid: "og:locale", name: "og:locale", content: "fa_IR" },
                { hid: "og:title", name: "og:title", content: metadata.title },
                { hid: "og:description", name: "og:description", content: metadata.description },
                { hid: "og:url", name: "og:url", content: metadata.site },
                { hid: "og:site_name", name: "og:site_name", content: metadata.title },
                // { hid: "og:image", name: "og:image", content: "" },

                { hid: "twitter:card", name: "twitter:card", content: "summary_large_image" },
                { hid: "twitter:site", name: "twitter:site", content: metadata.site },
                { hid: "twitter:description", name: "twitter:description", content: metadata.description },
                { hid: "twitter:title", name: "twitter:title", content: metadata.title },
                // { hid: "twitter:image", name: "twitter:image", content: "" },

                { hid: "robots", name: "robots", content: "max-image-preview:large" },
                { hid: "mobile-web-app-capable", name: "mobile-web-app-capable", content: "yes" },
                { hid: "msapplication-TileColor", name: "msapplication-TileColor", content: metadata.themeColor },
                { hid: "theme-color", name: "theme-color", content: metadata.themeColor },
            ],
            link: [
                { rel: "canonical", href: metadata.canonical },
                { rel: "apple-touch-icon", sizes: "180x180", href: "/favicon.ico" },
                { rel: "shortcut icon", type: "image/x-icon", href: "/favicon.ico" },
            ],
        });
    }
}
