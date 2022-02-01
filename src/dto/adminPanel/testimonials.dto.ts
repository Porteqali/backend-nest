import { IsEmail, IsNotEmpty, Length, IsString, IsArray, IsIn, IsOptional } from "class-validator";

export class CreateNewTestimonialAdminDto {
    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام کاربر را وارد کنید" })
    @IsNotEmpty({ message: "نام کاربر را وارد کنید" })
    readonly fullname: string;

    @Length(1, 100, { message: "عنوان حداکثر 100 کاراکتر" })
    @IsString({ message: "عنوان کاربر را وارد کنید" })
    @IsNotEmpty({ message: "عنوان کاربر را وارد کنید" })
    readonly title: string;

    @IsString({ message: "نظر را وارد کنید" })
    @IsNotEmpty({ message: "نظر را وارد کنید" })
    readonly comment: string;

    @IsIn(["teacher", "user"], { message: "حالت نمایش نامعتبر" })
    @IsString({ message: "حالت نمایش را انتخاب کنید" })
    @IsNotEmpty({ message: "حالت نمایش را انتخاب کنید" })
    readonly showAs: string;
}

export class UpdateNewTestimonialDto {
    @IsOptional()
    readonly image?: string;

    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام کاربر را وارد کنید" })
    @IsNotEmpty({ message: "نام کاربر را وارد کنید" })
    readonly fullname: string;

    @Length(1, 100, { message: "عنوان حداکثر 100 کاراکتر" })
    @IsString({ message: "عنوان کاربر را وارد کنید" })
    @IsNotEmpty({ message: "عنوان کاربر را وارد کنید" })
    readonly title: string;

    @IsString({ message: "نظر را وارد کنید" })
    @IsNotEmpty({ message: "نظر را وارد کنید" })
    readonly comment: string;

    @IsIn(["teacher", "user"], { message: "حالت نمایش نامعتبر" })
    @IsString({ message: "حالت نمایش را انتخاب کنید" })
    @IsNotEmpty({ message: "حالت نمایش را انتخاب کنید" })
    readonly showAs: string;
}
