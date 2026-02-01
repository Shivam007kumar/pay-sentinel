export enum PaymentMethod {
    CREDIT_CARD = "credit_card",
    DEBIT_CARD = "debit_card",
    BANK_TRANSFER = "bank_transfer",
    DIGITAL_WALLET = "digital_wallet"
}

export enum TransactionStatus {
    SUCCESS = "success",
    FAILED = "failed",
    PENDING = "pending",
    RETRY = "retry"
}

export interface TransactionSchema {
    transaction_id: string;
    timestamp: string; // ISO Date string
    amount: number;
    currency: string;
    payment_method: PaymentMethod;
    issuer: string;
    processor: string;
    status: TransactionStatus;
    error_code?: string;
    latency_ms: number;
    retry_count: number;
    bin_range?: string;
    region: string;
    metadata: Record<string, any>;
}
