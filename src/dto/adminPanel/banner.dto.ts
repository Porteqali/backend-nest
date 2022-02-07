import { IsEmail, IsNotEmpty, Length, IsString, IsArray, IsIn, IsOptional, IsDateString } from "class-validator";

export class UpdateBannerDto {
    @IsOptional()
    readonly image?: string;

    @IsString({ message: "رنگ پس زمینه بنر را مشخص کنید" })
    @IsNotEmpty({ message: "رنگ پس زمینه بنر را مشخص کنید" })
    readonly bgColor: string;

    @IsOptional()
    @Length(1, 500, { message: "متن بنر حداکثر 500 کاراکتر" })
    @IsString({ message: "متن بنر را وارد کنید" })
    readonly text?: string;

    @IsOptional()
    readonly code?: string;

    @IsOptional()
    readonly link?: string;

    @IsDateString({}, { message: "فرمت تاریخ نامعتبر" })
    @IsNotEmpty({ message: "تاریخ پایان را مشخص کنید" })
    readonly endDate: string;

    @IsIn(["active", "deactive"], { message: "وضعیت نامعتبر" })
    @IsString({ message: "یک وضعیت انتخاب کنید" })
    @IsNotEmpty({ message: "یک وضعیت انتخاب کنید" })
    readonly status: string;
}
