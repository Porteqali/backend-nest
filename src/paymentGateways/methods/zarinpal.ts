import axios from "axios";
import { Request } from "express";
import { GatewayInterface, TransactionResponse, VerficationResponseInterface } from "src/interfaces/Gateway";

export class Gateway implements GatewayInterface {
    private productGroup: string;

    constructor(productGroup) {
        this.productGroup = productGroup;
    }
    
    public async getIdentifier(apiKey: string, amount: number, redirect: string, description: string, mobile?): Promise<string> {
        let identifier = "";
        let url = `https://www.zarinpal.com/pg/rest/WebGate/PaymentRequest.json`;
        if (process.env.PAYMENT_IN_TEST == "true") url = `https://sandbox.zarinpal.com/pg/rest/WebGate/PaymentRequest.json`;

        await axios
            .post(url, {
                MerchantID: apiKey,
                Amount: amount,
                CallbackURL: redirect,
                Description: description,
                Mobile: mobile,
            })
            .then((response) => {
                if (response.data.Status == 100 && response.data.Authority) identifier = response.data.Authority;
            })
            .catch((error) => {
                // TODO : log the error in logger
            });
        return identifier;
    }

    public getGatewayUrl(identifier: string): string {
        // return `https://www.zarinpal.com/pg/StartPay/${identifier}`;

        let url = `https://www.zarinpal.com/pg/StartPay/${identifier}/ZarinGate`;
        if (process.env.PAYMENT_IN_TEST == "true") url = `https://sandbox.zarinpal.com/pg/StartPay/${identifier}`;

        return url;
    }

    public getTransactionResponse(req: Request): TransactionResponse {
        return {
            status: req.query.Status == "OK" ? "OK" : "NOK",
            identifier: req.query.Authority.toString(),
        };
    }

    public async verify(apiKey: string, identifier: string, extra?): Promise<VerficationResponseInterface> {
        return new Promise(async (resolve, reject) => {
            await axios
                .post("https://www.zarinpal.com/pg/rest/WebGate/PaymentVerification.json", {
                    MerchantID: apiKey,
                    Amount: extra.amount,
                    Authority: identifier,
                })
                .then((response) => {
                    resolve({
                        transactionCode: response.data.RefID,
                        status: response.data.Status,
                        other: response.data,
                    });
                })
                .catch((error) => {
                    reject(error);
                    // TODO : log the error in logger
                });
        });
    }
}
