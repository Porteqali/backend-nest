import { Request } from "express";
import { GatewayInterface, TransactionResponse, VerficationResponseInterface } from "src/interfaces/Gateway";
import { Gateway as Zarinpal } from "src/paymentGateways/methods/zarinpal";
import { Gateway as Wallet } from "src/paymentGateways/methods/wallet";

export class PaymentGateway {
    public method: string;
    private apiKey: string;
    private gateway: GatewayInterface;

    constructor(method: string, productGroup: "wallet-charge" | "course") {
        this.method = method;
        switch (this.method) {
            case "zarinpal":
                this.apiKey = process.env.ZARINPAL_KEY;
                this.gateway = new Zarinpal(productGroup);
                break;
            case "wallet":
                this.apiKey = "";
                this.gateway = new Wallet(productGroup);
                break;
            default:
                this.gateway = null;
                break;
        }
    }

    public async getIdentifier(apiKey: string, amount: number, redirect: string, description: string, mobile?): Promise<string> {
        return await this.gateway.getIdentifier(apiKey, amount, redirect, description, mobile);
    }
    public getGatewayUrl(identifier: string): string {
        return this.gateway.getGatewayUrl(identifier);
    }
    public getTransactionResponse(req: Request): TransactionResponse {
        return this.gateway.getTransactionResponse(req);
    }
    public async verify(apiKey: string, identifier: string, extra?): Promise<VerficationResponseInterface> {
        return await this.gateway.verify(apiKey, identifier, extra);
    }

    public getMethod() {
        return this.method;
    }
    public getApiKey() {
        return this.apiKey;
    }
}
