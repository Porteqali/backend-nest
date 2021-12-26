import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ContactRequestController } from "src/controllers/contactRequest.controller";
import { ContactRequestSchema } from "src/models/contactRequests.schema";
import { NewsletterSubscriberSchema } from "src/models/newsletterSubscribers.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: "ContactRequest", schema: ContactRequestSchema },
            { name: "NewsletterSubscriber", schema: NewsletterSubscriberSchema },
        ]),
    ],
    controllers: [ContactRequestController],
    providers: [],
    exports: [],
})
export class ContactRequestModule {}
