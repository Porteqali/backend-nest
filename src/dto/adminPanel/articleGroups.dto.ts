import { IsEmail, IsNotEmpty, Length, IsString, IsIn, IsOptional } from "class-validator";

export class CreateNewArticleGroupDto {
    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام گروه را وارد کنید" })
    @IsNotEmpty({ message: "نام گروه را وارد کنید" })
    readonly name: string;
}

export class UpdateArticleGroupDto {
    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام گروه را وارد کنید" })
    @IsNotEmpty({ message: "نام گروه را وارد کنید" })
    readonly name: string;
}
