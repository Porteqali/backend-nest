import { IsEmail, IsNotEmpty, Length, IsString, IsArray, IsIn, IsOptional, IsDateString } from "class-validator";

export class CreateNewArticleDto {
    @IsString({ message: "عنوان مطلب را وارد کنید" })
    @IsNotEmpty({ message: "عنوان مطلب را وارد کنید" })
    readonly title: string;

    @IsString({ message: "اسلاگ را وارد کنید" })
    @IsNotEmpty({ message: "اسلاگ را وارد کنید" })
    readonly slug: string;

    @IsDateString({}, { message: "فرمت تاریخ انتشار نامعتبر" })
    @IsNotEmpty({ message: "تاریخ انتشار را وارد کنید" })
    readonly publishedAt: string;

    @IsIn(["published", "pending"], { message: "وضعیت نامعتبر" })
    @IsString({ message: "یک وضعیت انتخاب کنید" })
    @IsNotEmpty({ message: "یک وضعیت انتخاب کنید" })
    readonly status: string;

    @IsString({ message: "توضیحات مطلب را وارد کنید" })
    @IsNotEmpty({ message: "توضیحات مطلب را وارد کنید" })
    readonly description: string;

    @IsString({ message: "متن مطلب را وارد کنید" })
    @IsNotEmpty({ message: "متن مطلب را وارد کنید" })
    readonly body: string;

    @IsOptional()
    readonly tags?: string;

    @IsString({ message: "عنوان متادیتا را وارد کنید" })
    @IsNotEmpty({ message: "عنوان متادیتا را وارد کنید" })
    readonly metadataTitle: string;

    @IsString({ message: "توضیحات متادیتا را وارد کنید" })
    @IsNotEmpty({ message: "توضیحات متادیتا را وارد کنید" })
    readonly metadataDescription: string;

    readonly inTextImageList: string;
}

export class UpdateArticleDto {
    @IsOptional()
    readonly image?: string;

    @IsOptional()
    readonly imageVertical?: string;

    @IsString({ message: "عنوان مطلب را وارد کنید" })
    @IsNotEmpty({ message: "عنوان مطلب را وارد کنید" })
    readonly title: string;

    @IsString({ message: "اسلاگ را وارد کنید" })
    @IsNotEmpty({ message: "اسلاگ را وارد کنید" })
    readonly slug: string;

    @IsDateString({}, { message: "فرمت تاریخ انتشار نامعتبر" })
    @IsNotEmpty({ message: "تاریخ انتشار را وارد کنید" })
    readonly publishedAt: string;

    @IsIn(["published", "pending"], { message: "وضعیت نامعتبر" })
    @IsString({ message: "یک وضعیت انتخاب کنید" })
    @IsNotEmpty({ message: "یک وضعیت انتخاب کنید" })
    readonly status: string;

    @IsString({ message: "توضیحات مطلب را وارد کنید" })
    @IsNotEmpty({ message: "توضیحات مطلب را وارد کنید" })
    readonly description: string;

    @IsString({ message: "متن مطلب را وارد کنید" })
    @IsNotEmpty({ message: "متن مطلب را وارد کنید" })
    readonly body: string;

    @IsOptional()
    readonly tags?: string;

    @IsString({ message: "عنوان متادیتا را وارد کنید" })
    @IsNotEmpty({ message: "عنوان متادیتا را وارد کنید" })
    readonly metadataTitle: string;

    @IsString({ message: "توضیحات متادیتا را وارد کنید" })
    @IsNotEmpty({ message: "توضیحات متادیتا را وارد کنید" })
    readonly metadataDescription: string;

    readonly inTextImageList: string;
}
