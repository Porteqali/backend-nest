import { IsEmail, IsNotEmpty, Length, IsString, IsIn, IsOptional, IsNumberString, IsDateString } from "class-validator";

export class CreateNewDiscountDto {
    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام تخفیف را وارد کنید" })
    @IsNotEmpty({ message: "نام تخفیف را وارد کنید" })
    readonly name: string;

    @IsIn(["code", "onCourse"], { message: "نوع تخفیف نامعتبر" })
    @IsString({ message: "نوع تخفیف را مشخص کنید" })
    @IsNotEmpty({ message: "نوع تخفیف را مشخص کنید" })
    readonly type: string;

    @IsNumberString({}, { message: "مقدار تخفیف باید عدد باشد" })
    @IsNotEmpty({ message: "مقدار تخفیف را وارد کنید" })
    readonly amount: number;

    @IsIn(["percent", "number"], { message: "نوع مقدار تخفیف نامعتبر" })
    @IsString({ message: "نوع مقدار تخفیف را مشخص کنید" })
    @IsNotEmpty({ message: "نوع مقدار تخفیف را مشخص کنید" })
    readonly amountType: string;

    @IsDateString({}, { message: "فرمت تاریخ شروع نامعتبر" })
    readonly startDate: string;

    @IsDateString({}, { message: "فرمت تاریخ اتمام نامعتبر" })
    readonly endDate: string;

    @IsIn(["active", "deactive"], { message: "وضعیت نامعتبر" })
    @IsString({ message: "یک وضعیت انتخاب کنید" })
    @IsNotEmpty({ message: "یک وضعیت انتخاب کنید" })
    readonly status: string;

    @IsIn(["allCourses", "course", "courseGroup", "teacherCourses", "singleUser"], { message: "حالت اعمال تخفیف نامعتبر" })
    @IsString({ message: "نوع اعمال تخفیف را انتخاب کنید" })
    @IsNotEmpty({ message: "نوع اعمال تخفیف را انتخاب کنید" })
    readonly emmitTo: string;

    @IsOptional()
    readonly emmitToId: string;

    @IsOptional()
    @IsString({ message: "کد تخفیف باید رشته ای از کاراکتر باشد" })
    readonly code: string;
}

export class UpdateDiscountDto {
    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام تخفیف را وارد کنید" })
    @IsNotEmpty({ message: "نام تخفیف را وارد کنید" })
    readonly name: string;

    @IsIn(["code", "onCourse"], { message: "نوع تخفیف نامعتبر" })
    @IsString({ message: "نوع تخفیف را مشخص کنید" })
    @IsNotEmpty({ message: "نوع تخفیف را مشخص کنید" })
    readonly type: string;

    @IsNumberString({}, { message: "مقدار تخفیف باید عدد باشد" })
    @IsNotEmpty({ message: "مقدار تخفیف را وارد کنید" })
    readonly amount: number;

    @IsIn(["percent", "number"], { message: "نوع مقدار تخفیف نامعتبر" })
    @IsString({ message: "نوع مقدار تخفیف را مشخص کنید" })
    @IsNotEmpty({ message: "نوع مقدار تخفیف را مشخص کنید" })
    readonly amountType: string;

    @IsDateString({ message: "فرمت تاریخ شروع نامعتبر" })
    readonly startDate: string;

    @IsDateString({ message: "فرمت تاریخ اتمام نامعتبر" })
    readonly endDate: string;

    @IsIn(["active", "deactive"], { message: "وضعیت نامعتبر" })
    @IsString({ message: "یک وضعیت انتخاب کنید" })
    @IsNotEmpty({ message: "یک وضعیت انتخاب کنید" })
    readonly status: string;

    @IsIn(["allCourses", "course", "courseGroup", "teacherCourses", "singleUser"], { message: "حالت اعمال تخفیف نامعتبر" })
    @IsString({ message: "نوع اعمال تخفیف را انتخاب کنید" })
    @IsNotEmpty({ message: "نوع اعمال تخفیف را انتخاب کنید" })
    readonly emmitTo: string;

    @IsOptional()
    readonly emmitToId: string;

    @IsOptional()
    @IsString({ message: "کد تخفیف باید رشته ای از کاراکتر باشد" })
    readonly code: string;
}
