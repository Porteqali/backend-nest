import { IsNotEmpty, IsString, IsNumberString, Min } from "class-validator";

export class WalletChargeDto {
    @IsString({ message: "روش پرداخت را انتخاب کنید" })
    @IsNotEmpty({ message: "روش پرداخت را انتخاب کنید" })
    readonly method: string;

    @IsNumberString({ message: "مبلغ مورد نظر را وارد کنید" })
    @IsNotEmpty({ message: "مبلغ مورد نظر را وارد کنید" })
    readonly amount: string;
}
