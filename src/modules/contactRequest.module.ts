import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ContactRequestController } from "src/controllers/contactRequest.controller";
import { ContactRequestSchema } from "src/models/contactRequests.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "ContactRequest", schema: ContactRequestSchema },
        ]),
    ],
    controllers: [ContactRequestController],
    providers: [],
    exports: [],
})
export class ContactRequestModule {}
