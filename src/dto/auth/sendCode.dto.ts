import { IsNotEmpty } from "class-validator";

export class SendCodeDto {
    @IsNotEmpty({ message: "ایمیل یا شماره همراه خود را وارد کنید" })
    readonly username: string;
}
