import { IsEmail, IsNotEmpty, Length, IsString, IsIn, IsOptional } from "class-validator";

export class CreateNewRoadmapQuestionDto {
    @Length(1, 250, { message: "سوال حداکثر 250 کاراکتر" })
    @IsString({ message: "سوال گروه را وارد کنید" })
    @IsNotEmpty({ message: "سوال گروه را وارد کنید" })
    readonly question: string;
}

export class UpdateRoadmapQuestionDto {
    @Length(1, 250, { message: "سوال حداکثر 250 کاراکتر" })
    @IsString({ message: "سوال گروه را وارد کنید" })
    @IsNotEmpty({ message: "سوال گروه را وارد کنید" })
    readonly question: string;
}
