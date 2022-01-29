import { IsEmail, IsNotEmpty, Length, IsString, IsIn, IsOptional, IsNumberString } from "class-validator";

export class CreateNewCommissionDto {
    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام کمیسیون را وارد کنید" })
    @IsNotEmpty({ message: "نام کمیسیون را وارد کنید" })
    readonly name: string;

    @IsIn(["percent", "number"], { message: "نوع کمیسیون نامعتبر" })
    @IsString({ message: "نوع کمیسیون را مشخص کنید" })
    @IsNotEmpty({ message: "نوع کمیسیون را مشخص کنید" })
    readonly type: string;

    @IsNumberString({ message: "مقدار کمیسیون باید عدد باشد" })
    @IsNotEmpty({ message: "مقدار کمیسیون را وارد کنید" })
    readonly amount: number;
}

export class UpdateCommissionDto {
    @Length(1, 100, { message: "نام حداکثر 100 کاراکتر" })
    @IsString({ message: "نام کمیسیون را وارد کنید" })
    @IsNotEmpty({ message: "نام کمیسیون را وارد کنید" })
    readonly name: string;

    @IsIn(["percent", "number"], { message: "نوع کمیسیون نامعتبر" })
    @IsString({ message: "نوع کمیسیون را مشخص کنید" })
    @IsNotEmpty({ message: "نوع کمیسیون را مشخص کنید" })
    readonly type: string;

    @IsNumberString({ message: "مقدار کمیسیون باید عدد باشد" })
    @IsNotEmpty({ message: "مقدار کمیسیون را وارد کنید" })
    readonly amount: number;
}
