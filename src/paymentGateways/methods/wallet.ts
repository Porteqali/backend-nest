import { Request } from "express";
import { randStr } from "src/helpers/str.helper";
import { GatewayInterface, TransactionResponse, VerficationResponseInterface } from "src/interfaces/Gateway";

export class Gateway implements GatewayInterface {
    public async getIdentifier(apiKey: string, amount: number, redirect: string, description: string, mobile?): Promise<string> {
        let identifier = randStr(16);
        return identifier;
    }

    public getGatewayUrl(identifier: string): string {
        return `${process.env.PAYMENTS_CALLBACK_URL.replace(":method", "wallet")}?identifier=${identifier},status=OK`;
    }

    public getTransactionResponse(req: Request): TransactionResponse {
        return {
            status: req.query.status == "OK" ? "OK" : "NOK",
            identifier: req.query.identifier.toString(),
        };
    }

    public async verify(apiKey: string, identifier: string, extra?): Promise<VerficationResponseInterface> {
        return {
            transactionCode: randStr(10),
            status: 1,
        };
    }
}
