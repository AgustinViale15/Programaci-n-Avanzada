export enum ActivationStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ActivationRequestedPayload {
  correlationId: string;
  clientDocument: string;
  serviceType: string;
  isSimulated?: boolean;
}

export interface BillingCompletedPayload {
  correlationId: string;
  invoiceId: string;
  amount: number;
}

export interface BillingFailedPayload {
  correlationId: string;
  reason: string;
}

export interface ProvisioningCompletedPayload {
  correlationId: string;
  serviceId: string;
  networkConfig: Record<string, any>;
}

export interface ProvisioningFailedPayload {
  correlationId: string;
  reason: string;
}

export interface ActivationCompletedPayload {
  correlationId: string;
  clientDocument: string;
  completedAt: string;
}

export interface ActivationFailedPayload {
  correlationId: string;
  reason: string;
  clientDocument: string;
}
