
import { PaymentMethod } from '../types';

export interface AsaasPaymentResponse {
  id: string;
  status: string;
  pixQrCode?: string;
  invoiceUrl: string;
}

export const asaasService = {
  // Mocking the creation of a payment in Asaas
  createPayment: async (amount: number, method: PaymentMethod, customerData: any): Promise<AsaasPaymentResponse> => {
    // In a real app, this would be a backend call to Asaas API
    // https://docs.asaas.com/reference/criar-nova-cobranca
    
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API latency

    const paymentId = 'pay_' + Math.random().toString(36).substr(2, 9);
    
    if (method === PaymentMethod.PIX) {
      return {
        id: paymentId,
        status: 'PENDING',
        pixQrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=mock-pix-payload-' + paymentId,
        invoiceUrl: 'https://asaas.com/i/' + paymentId
      };
    }

    return {
      id: paymentId,
      status: 'CONFIRMED', // Credit/Debit often instant in simulation
      invoiceUrl: 'https://asaas.com/i/' + paymentId
    };
  }
};
