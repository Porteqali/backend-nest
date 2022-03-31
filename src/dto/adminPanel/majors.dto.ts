import { IsEmail, IsNotEmpty, Length, IsString, IsArray, IsIn, IsOptional, IsNumberString } from "class-validator";

export class CreateNewMajorDto {
    @Length(1, 500, { message: "نام حداکثر 500 کاراکتر" })
    @IsString({ message: "عنوان باندل نقشه راه را وارد کنید" })
    @IsNotEmpty({ message: "عنوان باندل نقشه راه را وارد کنید" })
    readonly title: string;

    @IsString({ message: "اسلاگ را وارد کنید" })
    @IsNotEmpty({ message: "اسلاگ را وارد کنید" })
    readonly slug: string;

    @IsString({ message: "متن آشنایی با تخصص را وارد کنید" })
    @IsNotEmpty({ message: "متن آشنایی با تخصص را وارد کنید" })
    readonly text: string;

    @IsString({ message: "خلاصه توضیح را وارد کنید" })
    @IsNotEmpty({ message: "خلاصه توضیح را وارد کنید" })
    readonly desc: string;

    @IsString({ message: "عنوان متادیتا را وارد کنید" })
    @IsNotEmpty({ message: "عنوان متادیتا را وارد کنید" })
    readonly metadataTitle: string;

    @IsString({ message: "توضیحات متادیتا را وارد کنید" })
    @IsNotEmpty({ message: "توضیحات متادیتا را وارد کنید" })
    readonly metadataDescription: string;
}

export class UpdateMajorDto {
    @IsOptional()
    readonly image?: string;

    @Length(1, 500, { message: "نام حداکثر 500 کاراکتر" })
    @IsString({ message: "عنوان باندل نقشه راه را وارد کنید" })
    @IsNotEmpty({ message: "عنوان باندل نقشه راه را وارد کنید" })
    readonly title: string;

    @IsString({ message: "اسلاگ را وارد کنید" })
    @IsNotEmpty({ message: "اسلاگ را وارد کنید" })
    readonly slug: string;

    @IsString({ message: "متن آشنایی با تخصص را وارد کنید" })
    @IsNotEmpty({ message: "متن آشنایی با تخصص را وارد کنید" })
    readonly text: string;

    @IsString({ message: "خلاصه توضیح را وارد کنید" })
    @IsNotEmpty({ message: "خلاصه توضیح را وارد کنید" })
    readonly desc: string;

    @IsString({ message: "عنوان متادیتا را وارد کنید" })
    @IsNotEmpty({ message: "عنوان متادیتا را وارد کنید" })
    readonly metadataTitle: string;

    @IsString({ message: "توضیحات متادیتا را وارد کنید" })
    @IsNotEmpty({ message: "توضیحات متادیتا را وارد کنید" })
    readonly metadataDescription: string;
}
