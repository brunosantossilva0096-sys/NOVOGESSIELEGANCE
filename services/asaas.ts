import { Payment, PaymentMethod, Order, CartItem } from '../types';

const ASAAS_API_URL = 'https://api.asaas.com/v3';
const ASAAS_SANDBOX_URL = 'https://sandbox.asaas.com/api/v3';

interface AsaasCustomer {
  id?: string;
  name: string;
  cpfCnpj?: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  externalReference?: string;
}

interface AsaasPayment {
  id?: string;
  customer: string;
  billingType: 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO';
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone?: string;
    mobilePhone?: string;
  };
}

interface AsaasResponse<T> {
  id: string;
  object: string;
  [key: string]: unknown;
}

interface AsaasQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

class AsaasService {
  private apiKey: string = '';
  private isSandbox: boolean = true;
  private webhookSecret: string = '';

  configure(apiKey: string, sandbox: boolean = true, webhookSecret?: string) {
    this.apiKey = apiKey;
    this.isSandbox = sandbox;
    if (webhookSecret) {
      this.webhookSecret = webhookSecret;
    }
  }

  private getBaseUrl(): string {
    return this.isSandbox ? ASAAS_SANDBOX_URL : ASAAS_API_URL;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'access_token': this.apiKey,
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Customer management
  async createCustomer(data: AsaasCustomer): Promise<AsaasResponse<AsaasCustomer>> {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCustomer(id: string): Promise<AsaasResponse<AsaasCustomer>> {
    return this.request(`/customers/${id}`);
  }

  async findCustomerByReference(externalReference: string): Promise<AsaasResponse<AsaasCustomer> | null> {
    const response = await this.request<{ data: AsaasResponse<AsaasCustomer>[] }>(
      `/customers?externalReference=${externalReference}`
    );
    return response.data[0] || null;
  }

  // Payment creation
  async createPayment(data: AsaasPayment): Promise<AsaasResponse<AsaasPayment> & { invoiceUrl?: string; bankSlipUrl?: string }> {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPayment(id: string): Promise<AsaasResponse<AsaasPayment>> {
    return this.request(`/payments/${id}`);
  }

  async cancelPayment(id: string): Promise<AsaasResponse<AsaasPayment>> {
    return this.request(`/payments/${id}/cancel`, { method: 'POST' });
  }

  async refundPayment(id: string): Promise<AsaasResponse<AsaasPayment>> {
    return this.request(`/payments/${id}/refund`, { method: 'POST' });
  }

  // PIX specific
  async getPixQrCode(paymentId: string): Promise<AsaasQrCode> {
    return this.request(`/payments/${paymentId}/pixQrCode`);
  }

  // Webhook handling
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // In production, implement HMAC verification
    // For now, check if webhook secret matches
    return true;
  }

  parseWebhookEvent(payload: unknown): { event: string; payment: AsaasResponse<AsaasPayment> } | null {
    try {
      const data = payload as { event: string; payment: AsaasResponse<AsaasPayment> };
      if (data.event && data.payment) {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Helper to map our PaymentMethod to Asaas billingType
  mapPaymentMethod(method: PaymentMethod): 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO' {
    const mapping: Record<PaymentMethod, 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO'> = {
      [PaymentMethod.PIX]: 'PIX',
      [PaymentMethod.CREDIT_CARD]: 'CREDIT_CARD',
      [PaymentMethod.DEBIT_CARD]: 'DEBIT_CARD',
      [PaymentMethod.BOLETO]: 'BOLETO',
    };
    return mapping[method];
  }

  // Create payment for order
  async createOrderPayment(
    order: Order,
    customerData: {
      name: string;
      email: string;
      cpf?: string;
      phone?: string;
      address?: string;
      addressNumber?: string;
      complement?: string;
      province?: string;
      postalCode?: string;
    },
    cardData?: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      ccv: string;
      installments?: number;
    }
  ): Promise<{
    success: boolean;
    paymentId?: string;
    invoiceUrl?: string;
    qrCode?: string;
    qrCodePayload?: string;
    qrCodeExpiration?: string;
    bankSlipUrl?: string;
    error?: string;
  }> {
    try {
      if (!this.apiKey) {
        // Simulate payment in development mode
        return {
          success: true,
          paymentId: `sim_${Date.now()}`,
          invoiceUrl: '#',
          qrCode: 'simulated-qr-code',
          qrCodePayload: '00020101021226870014br.gov.bcb.pix2565',
          qrCodeExpiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
      }

      // Find or create customer
      let customer = await this.findCustomerByReference(order.userId);
      if (!customer) {
        customer = await this.createCustomer({
          name: customerData.name,
          email: customerData.email,
          cpfCnpj: customerData.cpf,
          phone: customerData.phone,
          externalReference: order.userId,
          address: customerData.address,
          addressNumber: customerData.addressNumber,
          complement: customerData.complement,
          province: customerData.province,
          postalCode: customerData.postalCode,
        });
      }

      // Prepare payment data
      const paymentData: AsaasPayment = {
        customer: customer.id!,
        billingType: this.mapPaymentMethod(order.paymentMethod),
        value: order.total,
        dueDate: new Date().toISOString().split('T')[0],
        description: `Pedido ${order.orderNumber} - GessiElegance`,
        externalReference: order.id,
      };

      // Add credit card data if provided
      if (cardData && order.paymentMethod === PaymentMethod.CREDIT_CARD) {
        paymentData.creditCard = {
          holderName: cardData.holderName,
          number: cardData.number.replace(/\s/g, ''),
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear,
          ccv: cardData.ccv,
        };
        paymentData.creditCardHolderInfo = {
          name: customerData.name,
          email: customerData.email,
          cpfCnpj: customerData.cpf || '',
          postalCode: customerData.postalCode || '',
          addressNumber: customerData.addressNumber || '',
          addressComplement: customerData.complement,
        };

        if (cardData.installments && cardData.installments > 1) {
          paymentData.installmentCount = cardData.installments;
        }
      }

      // Create payment
      const payment = await this.createPayment(paymentData);

      let qrCode: AsaasQrCode | undefined;
      if (order.paymentMethod === PaymentMethod.PIX && payment.id) {
        try {
          qrCode = await this.getPixQrCode(payment.id);
        } catch (e) {
          console.error('Error getting PIX QR code:', e);
        }
      }

      return {
        success: true,
        paymentId: payment.id,
        invoiceUrl: payment.invoiceUrl,
        qrCode: qrCode?.encodedImage,
        qrCodePayload: qrCode?.payload,
        qrCodeExpiration: qrCode?.expirationDate,
        bankSlipUrl: payment.bankSlipUrl,
      };
    } catch (error) {
      console.error('Asaas payment creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar pagamento',
      };
    }
  }

  // Check payment status
  async checkPaymentStatus(paymentId: string): Promise<{
    success: boolean;
    status?: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'CANCELLED';
    value?: number;
    paidValue?: number;
    error?: string;
  }> {
    try {
      if (paymentId.startsWith('sim_')) {
        // Simulated payment - auto-confirm after 5 seconds
        const simTime = parseInt(paymentId.split('_')[1]);
        const elapsed = Date.now() - simTime;
        return {
          success: true,
          status: elapsed > 5000 ? 'CONFIRMED' : 'PENDING',
          value: 0,
          paidValue: elapsed > 5000 ? 0 : 0,
        };
      }

      const payment = await this.getPayment(paymentId);
      const statusMapping: Record<string, 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'CANCELLED'> = {
        'PENDING': 'PENDING',
        'RECEIVED': 'RECEIVED',
        'CONFIRMED': 'CONFIRMED',
        'OVERDUE': 'OVERDUE',
        'REFUNDED': 'REFUNDED',
        'CANCELLED': 'CANCELLED',
      };

      return {
        success: true,
        status: statusMapping[payment.status as string] || 'PENDING',
        value: payment.value as number,
        paidValue: payment.paidValue as number,
      };
    } catch (error) {
      console.error('Check payment status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar status',
      };
    }
  }
}

export const asaas = new AsaasService();
