import { IsEmail, IsNotEmpty, Length, IsString, IsArray, IsIn, IsOptional, IsNumberString } from "class-validator";

export class CreateNewBundleDto {
    @Length(1, 500, { message: "نام حداکثر 500 کاراکتر" })
    @IsString({ message: "عنوان باندل نقشه راه را وارد کنید" })
    @IsNotEmpty({ message: "عنوان باندل نقشه راه را وارد کنید" })
    readonly title: string;

    @IsNumberString({ message: "درصد کد هدیه باید عدد باشد" })
    @IsNotEmpty({ message: "درصد کد هدیه را وارد کنید" })
    @IsOptional()
    readonly giftCodePercent?: number;

    @IsOptional()
    readonly giftCodeDeadline?: number;

    @IsNumberString({ message: "درصد تخفیف باید عدد باشد" })
    @IsNotEmpty({ message: "درصد تخفیف را وارد کنید" })
    readonly discountPercent: number;
}

export class UpdateBundleDto {
    @Length(1, 500, { message: "نام حداکثر 500 کاراکتر" })
    @IsString({ message: "عنوان باندل نقشه راه را وارد کنید" })
    @IsNotEmpty({ message: "عنوان باندل نقشه راه را وارد کنید" })
    readonly title: string;

    @IsNumberString({ message: "درصد کد هدیه باید عدد باشد" })
    @IsNotEmpty({ message: "درصد کد هدیه را وارد کنید" })
    @IsOptional()
    readonly giftCodePercent?: number;

    @IsOptional()
    readonly giftCodeDeadline?: number;

    @IsNumberString({ message: "درصد تخفیف باید عدد باشد" })
    @IsNotEmpty({ message: "درصد تخفیف را وارد کنید" })
    readonly discountPercent: number;
}
