import { IsEmail, IsNotEmpty, Length, IsString, IsIn, IsOptional } from "class-validator";

export class CreateNewMetadataDto {
    @IsString({ message: "صفحه را مشخص کنید" })
    @IsNotEmpty({ message: "صفحه را مشخص کنید" })
    readonly page: string;

    @Length(1, 200, { message: "عنوان حداکثر 200 کاراکتر" })
    @IsString({ message: "عنوان را وارد کنید" })
    @IsNotEmpty({ message: "عنوان را وارد کنید" })
    readonly title: string;

    @Length(1, 256, { message: "توضیحات حداکثر 256 کاراکتر" })
    @IsString({ message: "توضیحات را وارد کنید" })
    @IsNotEmpty({ message: "توضیحات را وارد کنید" })
    readonly description: string;

    @IsString({ message: "کلیدواژه را وارد کنید" })
    @IsNotEmpty({ message: "کلیدواژه را وارد کنید" })
    readonly keywords: string;

    @IsString({ message: "لینک canonical را وارد کنید" })
    @IsNotEmpty({ message: "لینک canonical را وارد کنید" })
    readonly canonical: string;

    @IsString({ message: "تم صفحه را انتخاب کنید" })
    @IsNotEmpty({ message: "تم صفحه را انتخاب کنید" })
    readonly themeColor: string;

    @IsString({ message: "لینک صفحه را وارد کنید" })
    @IsNotEmpty({ message: "لینک صفحه را وارد کنید" })
    readonly site: string;

    @IsString({ message: "زبان صفحه را وارد کنید" })
    @IsNotEmpty({ message: "زبان صفحه را وارد کنید" })
    readonly language: string;
}

export class UpdateMetadataDto {
    @IsString({ message: "صفحه را مشخص کنید" })
    @IsNotEmpty({ message: "صفحه را مشخص کنید" })
    readonly page: string;
    
    @Length(1, 200, { message: "عنوان حداکثر 200 کاراکتر" })
    @IsString({ message: "عنوان را وارد کنید" })
    @IsNotEmpty({ message: "عنوان را وارد کنید" })
    readonly title: string;

    @Length(1, 256, { message: "توضیحات حداکثر 256 کاراکتر" })
    @IsString({ message: "توضیحات را وارد کنید" })
    @IsNotEmpty({ message: "توضیحات را وارد کنید" })
    readonly description: string;

    @IsString({ message: "کلیدواژه را وارد کنید" })
    @IsNotEmpty({ message: "کلیدواژه را وارد کنید" })
    readonly keywords: string;

    @IsString({ message: "لینک canonical را وارد کنید" })
    @IsNotEmpty({ message: "لینک canonical را وارد کنید" })
    readonly canonical: string;

    @IsString({ message: "تم صفحه را انتخاب کنید" })
    @IsNotEmpty({ message: "تم صفحه را انتخاب کنید" })
    readonly themeColor: string;

    @IsString({ message: "لینک صفحه را وارد کنید" })
    @IsNotEmpty({ message: "لینک صفحه را وارد کنید" })
    readonly site: string;

    @IsString({ message: "زبان صفحه را وارد کنید" })
    @IsNotEmpty({ message: "زبان صفحه را وارد کنید" })
    readonly language: string;
}
