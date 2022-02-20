import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FaqsController } from "src/controllers/faqs.controller";
import { FaqSchema } from "src/models/faqs.schema";

@Module({
    imports: [MongooseModule.forFeature([{ name: "Faqs", schema: FaqSchema }])],
    controllers: [FaqsController],
    providers: [],
    exports: [],
})
export class FaqsModule {}
