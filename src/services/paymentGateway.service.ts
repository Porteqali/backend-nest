import { Request } from "express";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { GatewayInterface, TransactionResponse, VerficationResponseInterface } from "src/interfaces/Gateway";
import { Gateway as Zarinpal } from "src/paymentGateways/zarinpal";

interface cartInfo {
    totalPrice: number;
    totalDiscount: number;
    totalDiscountPercent: number;
    payablePrice: number;
}

@Injectable()
export class PaymentGatewayService {
    public method: string;
    private apiKey: string;
    private gateway: GatewayInterface;

    constructor(method: string) {
        this.method = method;
        switch (this.method) {
            case "zarinpal":
                this.apiKey = process.env.ZARINPAL_KEY;
                this.gateway = new Zarinpal();
                break;
            case "pay_ir":
                throw new ForbiddenException();
                // this.apiKey = process.env.PAY_IR_KEY;
                // this.gateway = new PayIr();
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
