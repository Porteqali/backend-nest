import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CollaborateRequestController } from "src/controllers/collaborateRequest.controller";
import { CollaborateRequestSchema } from "src/models/collaborateRequests.schema";

@Module({
    imports: [MongooseModule.forFeature([{ name: "CollaborateRequest", schema: CollaborateRequestSchema }])],
    controllers: [CollaborateRequestController],
    providers: [],
    exports: [],
})
export class CollaborateRequestModule {}
