import { IsEmail, IsNotEmpty, Length, IsString, IsArray, IsIn, IsOptional, IsDateString } from "class-validator";

export class UpdateLatestNewsDto {
    @IsString({ message: "عنوان خبر را مشخص کنید" })
    @IsNotEmpty({ message: "عنوان خبر را مشخص کنید" })
    readonly title: string;

    @Length(1, 500, { message: "متن خبر حداکثر 500 کاراکتر" })
    @IsString({ message: "متن خبر را وارد کنید" })
    readonly text?: string;
    
    @IsOptional()
    @IsString({ message: "لینک را مشخص کنید" })
    @IsNotEmpty({ message: "لینک را مشخص کنید" })
    readonly link: string;
    
    @IsOptional()
    @IsString({ message: "متن لینک را مشخص کنید" })
    @IsNotEmpty({ message: "متن لینک را مشخص کنید" })
    readonly link_text: string;

    @IsIn(["file", "link"], { message: "نوع ویدیو نامعتبر" })
    @IsString({ message: "نوع ویدیو را مشخص کنید" })
    @IsNotEmpty({ message: "نوع ویدیو را مشخص کنید" })
    readonly videoType: string;

    @IsIn(["active", "deactive"], { message: "وضعیت نامعتبر" })
    @IsString({ message: "یک وضعیت انتخاب کنید" })
    @IsNotEmpty({ message: "یک وضعیت انتخاب کنید" })
    readonly status: string;
}
