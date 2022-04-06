import { IsEmail, IsNotEmpty, Length, IsString, IsIn, IsOptional } from "class-validator";

export class CreateNewRoadmapQuestionDto {
    @Length(1, 250, { message: "سوال حداکثر 250 کاراکتر" })
    @IsString({ message: "سوال گروه را وارد کنید" })
    @IsNotEmpty({ message: "سوال گروه را وارد کنید" })
    readonly question: string;

    @IsString({ message: "یک گروه سوال انتخاب کنید" })
    @IsNotEmpty({ message: "یک گروه سوال انتخاب کنید" })
    readonly questionGroup: string;

    @Length(1, 250, { message: "هر گزینه حداکثر 250 کاراکتر" })
    @IsString({ message: "گزینه 1 را وارد کنید" })
    @IsNotEmpty({ message: "گزینه 1 را وارد کنید" })
    readonly option1: string;

    @Length(1, 250, { message: "هر گزینه حداکثر 250 کاراکتر" })
    @IsString({ message: "گزینه 2 را وارد کنید" })
    @IsNotEmpty({ message: "گزینه 2 را وارد کنید" })
    readonly option2: string;

    @Length(1, 250, { message: "هر گزینه حداکثر 250 کاراکتر" })
    @IsString({ message: "گزینه 3 را وارد کنید" })
    @IsNotEmpty({ message: "گزینه 3 را وارد کنید" })
    @IsOptional()
    readonly option3?: string;

    @Length(1, 250, { message: "هر گزینه حداکثر 250 کاراکتر" })
    @IsString({ message: "گزینه 4 را وارد کنید" })
    @IsNotEmpty({ message: "گزینه 4 را وارد کنید" })
    @IsOptional()
    readonly option4?: string;

    readonly majors: any;
}

export class UpdateRoadmapQuestionDto {
    @Length(1, 250, { message: "سوال حداکثر 250 کاراکتر" })
    @IsString({ message: "سوال گروه را وارد کنید" })
    @IsNotEmpty({ message: "سوال گروه را وارد کنید" })
    readonly question: string;

    @IsString({ message: "یک گروه سوال انتخاب کنید" })
    @IsNotEmpty({ message: "یک گروه سوال انتخاب کنید" })
    readonly questionGroup: any;

    @Length(1, 250, { message: "هر گزینه حداکثر 250 کاراکتر" })
    @IsString({ message: "گزینه 1 را وارد کنید" })
    @IsNotEmpty({ message: "گزینه 1 را وارد کنید" })
    readonly option1: string;

    @Length(1, 250, { message: "هر گزینه حداکثر 250 کاراکتر" })
    @IsString({ message: "گزینه 2 را وارد کنید" })
    @IsNotEmpty({ message: "گزینه 2 را وارد کنید" })
    readonly option2: string;

    @Length(1, 250, { message: "هر گزینه حداکثر 250 کاراکتر" })
    @IsString({ message: "گزینه 3 را وارد کنید" })
    @IsNotEmpty({ message: "گزینه 3 را وارد کنید" })
    @IsOptional()
    readonly option3?: string;

    @Length(1, 250, { message: "هر گزینه حداکثر 250 کاراکتر" })
    @IsString({ message: "گزینه 4 را وارد کنید" })
    @IsNotEmpty({ message: "گزینه 4 را وارد کنید" })
    @IsOptional()
    readonly option4?: string;

    readonly majors: any;
}
