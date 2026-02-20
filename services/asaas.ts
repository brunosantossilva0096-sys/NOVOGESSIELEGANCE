/**
 * AsaasService — Gateway de pagamento centralizado.
 * Em produção (Netlify), usa o proxy /.netlify/functions/asaas-proxy para evitar CORS.
 * Em desenvolvimento local, chama a API diretamente com o token (requer proxy local ou cors-anywhere).
 */

import { PaymentMethod, Order } from '../types';

const IS_NETLIFY = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
const PROXY_URL = '/.netlify/functions/asaas-proxy';
// Fallback direto para dev — em produção o proxy já injeta o token
const DIRECT_URL = 'https://api.asaas.com/v3';
const API_TOKEN = 'cb44adc0-3e19-4e11-b8e6-7c1a378642da';

/* =========================================================
   Interfaces Asaas
   ========================================================= */
export interface AsaasCustomer {
  id?: string;
  name: string;
  cpfCnpj: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string; // bairro
  postalCode?: string;
  externalReference?: string;
}

export interface AsaasPaymentInput {
  customer: string;          // ID do cliente Asaas
  billingType: 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO';
  value: number;
  dueDate: string;           // YYYY-MM-DD
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

export interface AsaasPaymentResult {
  success: boolean;
  paymentId?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  qrCodeImage?: string;     // base64 do QR Code PIX
  qrCodePayload?: string;   // copia e cola PIX
  qrCodeExpiration?: string;
  error?: string;
}

export interface AsaasPaymentStatus {
  success: boolean;
  status?: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'CANCELLED';
  value?: number;
  paidValue?: number;
  paidAt?: string;
  error?: string;
}

/* =========================================================
   Classe principal
   ========================================================= */
class AsaasService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    let url: string;
    let headers: HeadersInit;

    if (IS_NETLIFY) {
      // Usa o proxy Netlify em produção
      url = `${PROXY_URL}?endpoint=${encodeURIComponent(endpoint)}`;
      headers = { 'Content-Type': 'application/json' };
    } else {
      // Em dev local, chama diretamente (pode precisar de extensão CORS no browser ou proxy)
      url = `${DIRECT_URL}${endpoint}`;
      headers = {
        'Content-Type': 'application/json',
        'access_token': API_TOKEN,
      };
    }

    const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ errors: [{ description: `HTTP ${response.status}` }] }));
      const msg = errData?.errors?.[0]?.description || errData?.message || `Erro HTTP ${response.status}`;
      throw new Error(msg);
    }

    return response.json() as Promise<T>;
  }

  /* ----- Customers ----- */
  async findOrCreateCustomer(data: Omit<AsaasCustomer, 'id'>): Promise<string> {
    // Busca por referência externa (userId)
    if (data.externalReference) {
      try {
        const found = await this.request<{ data: { id: string }[] }>(
          `/customers?externalReference=${data.externalReference}`
        );
        if (found.data?.[0]?.id) return found.data[0].id;
      } catch {
        // Continua para criação
      }
    }

    const customer = await this.request<{ id: string }>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return customer.id;
  }

  /* ----- Payments ----- */
  async createPayment(data: AsaasPaymentInput): Promise<{ id: string; invoiceUrl?: string; bankSlipUrl?: string }> {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPixQrCode(paymentId: string): Promise<{ encodedImage: string; payload: string; expirationDate: string }> {
    return this.request(`/payments/${paymentId}/pixQrCode`);
  }

  async getPaymentStatus(paymentId: string): Promise<{
    id: string;
    status: string;
    value: number;
    netValue: number;
    paymentDate?: string;
  }> {
    return this.request(`/payments/${paymentId}`);
  }

  async cancelPayment(paymentId: string): Promise<void> {
    await this.request(`/payments/${paymentId}/cancel`, { method: 'POST' });
  }

  /* ----- Método principal: criar cobrança completa para pedido ----- */
  async createOrderPayment(params: {
    order: Order;
    customer: {
      name: string;
      email: string;
      cpfCnpj: string;
      phone?: string;
      postalCode?: string;
      address?: string;
      addressNumber?: string;
      complement?: string;
      province?: string;
    };
    cardData?: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      ccv: string;
      installments?: number;
    };
  }): Promise<AsaasPaymentResult> {
    try {
      const { order, customer, cardData } = params;

      // 1. Encontra ou cria cliente
      const customerId = await this.findOrCreateCustomer({
        name: customer.name,
        cpfCnpj: customer.cpfCnpj || '00000000000',
        email: customer.email,
        mobilePhone: customer.phone,
        postalCode: customer.postalCode,
        address: customer.address,
        addressNumber: customer.addressNumber,
        complement: customer.complement,
        province: customer.province,
        externalReference: order.userId,
      });

      // 2. Prepara dados do pagamento
      const billingType = this.mapBillingType(order.paymentMethod);
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const paymentInput: AsaasPaymentInput = {
        customer: customerId,
        billingType,
        value: order.total,
        dueDate,
        description: `Pedido ${order.orderNumber} — GessiElegance`,
        externalReference: order.id,
      };

      // 3. Dados do cartão, se aplicável
      if (cardData && billingType === 'CREDIT_CARD') {
        paymentInput.creditCard = {
          holderName: cardData.holderName,
          number: cardData.number.replace(/\s/g, ''),
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear,
          ccv: cardData.ccv,
        };
        paymentInput.creditCardHolderInfo = {
          name: customer.name,
          email: customer.email,
          cpfCnpj: customer.cpfCnpj || '00000000000',
          postalCode: customer.postalCode || '00000000',
          addressNumber: customer.addressNumber || 'S/N',
          addressComplement: customer.complement,
          mobilePhone: customer.phone,
        };
        if (cardData.installments && cardData.installments > 1) {
          paymentInput.installmentCount = cardData.installments;
          paymentInput.installmentValue = parseFloat((order.total / cardData.installments).toFixed(2));
        }
      }

      // 4. Cria o pagamento
      const payment = await this.createPayment(paymentInput);

      // 5. Se for PIX, busca QR Code
      let qrCodeImage: string | undefined;
      let qrCodePayload: string | undefined;
      let qrCodeExpiration: string | undefined;

      if (billingType === 'PIX' && payment.id) {
        try {
          const pix = await this.getPixQrCode(payment.id);
          qrCodeImage = `data:image/png;base64,${pix.encodedImage}`;
          qrCodePayload = pix.payload;
          qrCodeExpiration = pix.expirationDate;
        } catch (e) {
          console.warn('Não foi possível obter QR Code PIX:', e);
        }
      }

      return {
        success: true,
        paymentId: payment.id,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
        qrCodeImage,
        qrCodePayload,
        qrCodeExpiration,
      };
    } catch (error) {
      console.error('[AsaasService] Erro ao criar pagamento:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao criar cobrança',
      };
    }
  }

  /* ----- Verificar status do pagamento ----- */
  async checkPaymentStatus(paymentId: string): Promise<AsaasPaymentStatus> {
    try {
      const data = await this.getPaymentStatus(paymentId);
      return {
        success: true,
        status: data.status as AsaasPaymentStatus['status'],
        value: data.value,
        paidValue: data.netValue,
        paidAt: data.paymentDate,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar status',
      };
    }
  }

  /* ----- Utilitários ----- */
  private mapBillingType(method: PaymentMethod): AsaasPaymentInput['billingType'] {
    const map: Record<PaymentMethod, AsaasPaymentInput['billingType']> = {
      [PaymentMethod.PIX]: 'PIX',
      [PaymentMethod.CREDIT_CARD]: 'CREDIT_CARD',
      [PaymentMethod.DEBIT_CARD]: 'DEBIT_CARD',
      [PaymentMethod.BOLETO]: 'BOLETO',
      [PaymentMethod.CASH]: 'PIX', // fallback para dinheiro → não usa Asaas
    };
    return map[method] ?? 'PIX';
  }

  /** Formata CPF/CNPJ removendo pontução */
  static cleanDocument(doc: string): string {
    return doc.replace(/\D/g, '');
  }
}

export const asaasService = new AsaasService();

/** Exportação standalone de cleanDocument para uso em componentes */
export const cleanDocument = (doc: string): string => doc.replace(/\D/g, '');
