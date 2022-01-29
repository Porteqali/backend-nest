import { IsEmail, IsNotEmpty, Length, IsString, IsIn, IsOptional } from "class-validator";

export class CreateNewCourseGroupDto {
    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام گروه را وارد کنید" })
    @IsNotEmpty({ message: "نام گروه را وارد کنید" })
    readonly name: string;

    @IsIn(["active", "deactive"], { message: "وضعیت نامعتبر" })
    @IsString({ message: "یک وضعیت انتخاب کنید" })
    @IsNotEmpty({ message: "یک وضعیت انتخاب کنید" })
    readonly status: string;

    @IsIn(["network", "languages", "graphic", "university", "programming", "web-design", "business", "free"], { message: "گروه اصلی نامعتبر" })
    @IsString({ message: "گروه اصلی را انتخاب کنید" })
    @IsNotEmpty({ message: "گروه اصلی را انتخاب کنید" })
    readonly topGroup: string;
}

export class UpdateCourseGroupDto {
    @IsOptional()
    readonly image?: string;

    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام گروه را وارد کنید" })
    @IsNotEmpty({ message: "نام گروه را وارد کنید" })
    readonly name: string;

    @IsIn(["active", "deactive"], { message: "وضعیت نامعتبر" })
    @IsString({ message: "یک وضعیت انتخاب کنید" })
    @IsNotEmpty({ message: "یک وضعیت انتخاب کنید" })
    readonly status: string;

    @IsIn(["network", "languages", "graphic", "university", "programming", "web-design", "business", "free"], { message: "گروه اصلی نامعتبر" })
    @IsString({ message: "گروه اصلی را انتخاب کنید" })
    @IsNotEmpty({ message: "گروه اصلی را انتخاب کنید" })
    readonly topGroup: string;
}
