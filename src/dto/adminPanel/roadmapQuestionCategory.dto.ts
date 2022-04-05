import { IsEmail, IsNotEmpty, Length, IsString, IsIn, IsOptional } from "class-validator";

export class CreateNewRoadmapQuestionCategoryDto {
    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام گروه را وارد کنید" })
    @IsNotEmpty({ message: "نام گروه را وارد کنید" })
    readonly name: string;

    @Length(1, 256, { message: "توضیحات حداکثر 256 کاراکتر" })
    @IsString({ message: "توضیحات را وارد کنید" })
    @IsNotEmpty({ message: "توضیحات را وارد کنید" })
    readonly desc: string;
}

export class UpdateRoadmapQuestionCategoryDto {
    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام گروه را وارد کنید" })
    @IsNotEmpty({ message: "نام گروه را وارد کنید" })
    readonly name: string;
    
    @Length(1, 256, { message: "توضیحات حداکثر 256 کاراکتر" })
    @IsString({ message: "توضیحات را وارد کنید" })
    @IsNotEmpty({ message: "توضیحات را وارد کنید" })
    readonly desc: string;
}
