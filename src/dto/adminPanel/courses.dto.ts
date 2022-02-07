import { IsEmail, IsNotEmpty, Length, IsString, IsArray, IsIn, IsOptional, IsNumberString } from "class-validator";

export class CreateNewCourseDto {
    @Length(1, 500, { message: "نام حداکثر 500 کاراکتر" })
    @IsString({ message: "عنوان دوره را وارد کنید" })
    @IsNotEmpty({ message: "عنوان دوره را وارد کنید" })
    readonly name: string;

    @Length(1, 5000, { message: "توضیحات حداکثر 5000 کاراکتر" })
    @IsString({ message: "توضیحات را وارد کنید" })
    @IsNotEmpty({ message: "توضیحات را وارد کنید" })
    readonly description: string;

    @IsNumberString({ message: "مبلغ باید عدد باشد" })
    @IsNotEmpty({ message: "مبلغ دوره را وارد کنید" })
    readonly price: string;

    @IsString({ message: "حداقل یک گروه برای دوره انتخاب کنید انتخاب کنید" })
    @IsNotEmpty({ message: "حداقل یک گروه برای دوره انتخاب کنید انتخاب کنید" })
    readonly groups: string;

    @IsIn(["active", "deactive"], { message: "وضعیت نامعتبر" })
    @IsString({ message: "یک وضعیت انتخاب کنید" })
    @IsNotEmpty({ message: "یک وضعیت انتخاب کنید" })
    readonly status: string;

    @IsString({ message: "استاد دوره را انتخاب کنید" })
    @IsNotEmpty({ message: "استاد دوره را انتخاب کنید" })
    readonly teacher: string;

    @IsOptional()
    readonly commission?: string;

    @IsOptional()
    readonly tags?: string;

    @IsIn(["true", "false"], { message: "فرمت نمایش در جدید نامعتبر" })
    readonly showInNew: string;
}

export class UpdateCourseDto {
    @IsOptional()
    readonly image?: string;

    @Length(1, 500, { message: "نام حداکثر 500 کاراکتر" })
    @IsString({ message: "عنوان دوره را وارد کنید" })
    @IsNotEmpty({ message: "عنوان دوره را وارد کنید" })
    readonly name: string;

    @Length(1, 5000, { message: "توضیحات حداکثر 5000 کاراکتر" })
    @IsString({ message: "توضیحات را وارد کنید" })
    @IsNotEmpty({ message: "توضیحات را وارد کنید" })
    readonly description: string;

    @IsNumberString({ message: "مبلغ باید عدد باشد" })
    @IsNotEmpty({ message: "مبلغ دوره را وارد کنید" })
    readonly price: string;

    @IsString({ message: "حداقل یک گروه برای دوره انتخاب کنید انتخاب کنید" })
    @IsNotEmpty({ message: "حداقل یک گروه برای دوره انتخاب کنید انتخاب کنید" })
    readonly groups: string;

    @IsIn(["active", "deactive"], { message: "وضعیت نامعتبر" })
    @IsString({ message: "یک وضعیت انتخاب کنید" })
    @IsNotEmpty({ message: "یک وضعیت انتخاب کنید" })
    readonly status: string;

    @IsString({ message: "استاد دوره را انتخاب کنید" })
    @IsNotEmpty({ message: "استاد دوره را انتخاب کنید" })
    readonly teacher: string;

    @IsOptional()
    readonly commission?: string;

    @IsOptional()
    readonly tags?: string;

    @IsIn(["true", "false"], { message: "فرمت نمایش در جدید نامعتبر" })
    readonly showInNew: string;
}
