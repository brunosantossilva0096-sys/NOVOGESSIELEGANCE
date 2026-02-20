import type { ShippingMethod, ShippingQuote } from '../types';

interface SuperFreteConfig {
  token: string;
  sandbox: boolean;
}

interface SuperFreteAddress {
  postal_code: string;
  address: string;
  number: string;
  district?: string;
  city: string;
  state_code: string;
  country: string;
}

interface SuperFreteProduct {
  name: string;
  quantity: number;
  unitary_value: number;
  weight: number;
  length: number;
  height: number;
  width: number;
}

interface SuperFreteQuoteRequest {
  from: SuperFreteAddress;
  to: SuperFreteAddress;
  products: SuperFreteProduct[];
  options: {
    insurance_value: number;
    receipt: boolean;
    own_hand: boolean;
    collect: boolean;
    validate: boolean;
  };
  services?: string[];
}

interface SuperFreteQuoteResponse {
  id: string;
  name: string;
  price: string;
  discount: string;
  currency: string;
  delivery_time: number;
  delivery_range: {
    min: number;
    max: number;
  };
  custom_price: boolean;
  custom_delivery_time: boolean;
  custom_delivery_time_min?: number;
  custom_delivery_time_max?: number;
  packages: {
    weight: number;
    width: number;
    height: number;
    length: number;
    format: 'box' | 'roll' | 'envelope';
    products: {
      id?: string;
      name: string;
      quantity: number;
      unitary_value: number;
      insurance_value: number;
      weight: number;
      length: number;
      height: number;
      width: number;
    }[];
  }[];
  company: {
    name: string;
    picture: string;
  };
  service_id: string;
  service_name: string;
  additional_services: {
    name: string;
    value: number;
  }[];
}

class SuperFreteService {
  private config: SuperFreteConfig | null = null;
  private readonly BASE_URL = 'https://api.superfrete.com/api/v0';

  configure(token: string, sandbox: boolean = false) {
    this.config = { token, sandbox };
  }

  private getHeaders(): HeadersInit {
    if (!this.config) {
      throw new Error('SuperFrete não configurado. Use configure() primeiro.');
    }

    return {
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`SuperFrete API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('SuperFrete request error:', error);
      throw error;
    }
  }

  async calculateShipping(
    fromZip: string,
    toZip: string,
    products: Array<{
      name: string;
      quantity: number;
      value: number;
      weight: number;
      dimensions: { height: number; width: number; length: number };
    }>,
    options: {
      insuranceValue?: number;
      receipt?: boolean;
      ownHand?: boolean;
      collect?: boolean;
    } = {}
  ): Promise<{ success: boolean; quotes: ShippingQuote[]; error?: string }> {
    try {
      if (!this.config) {
        return { success: false, quotes: [], error: 'SuperFrete não configurado' };
      }

      const requestData: SuperFreteQuoteRequest = {
        from: {
          postal_code: fromZip,
          address: 'Rua da Loja',
          number: '123',
          district: 'Centro',
          city: 'São Luís',
          state_code: 'MA',
          country: 'BR',
        },
        to: {
          postal_code: toZip,
          address: 'Rua do Cliente',
          number: '1',
          district: 'Bairro',
          city: 'Cidade',
          state_code: 'MA',
          country: 'BR',
        },
        products: products.map(product => ({
          name: product.name,
          quantity: product.quantity,
          unitary_value: product.value,
          weight: product.weight * 1000, // Convert to grams
          length: product.dimensions.length,
          height: product.dimensions.height,
          width: product.dimensions.width,
        })),
        options: {
          insurance_value: options.insuranceValue || products.reduce((sum, p) => sum + (p.value * p.quantity), 0),
          receipt: options.receipt || false,
          own_hand: options.ownHand || false,
          collect: options.collect || false,
          validate: true,
        },
      };

      const response = await this.makeRequest<SuperFreteQuoteResponse[]>('/shipping/calculate', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const quotes: ShippingQuote[] = response.map(quote => {
        const method: ShippingMethod = {
          id: quote.service_id,
          name: quote.company.name,
          type: 'correios',
          cost: parseFloat(quote.price),
          estimatedDays: `${quote.delivery_range.min}-${quote.delivery_range.max} dias úteis`,
          isActive: true,
        };

        return {
          method,
          cost: parseFloat(quote.price),
          estimatedDays: `${quote.delivery_range.min}-${quote.delivery_range.max} dias úteis`,
        };
      });

      return { success: true, quotes };
    } catch (error) {
      console.error('SuperFrete shipping calculation error:', error);
      return { 
        success: false, 
        quotes: [], 
        error: error instanceof Error ? error.message : 'Erro ao calcular frete com SuperFrete' 
      };
    }
  }

  async getServices(): Promise<{ success: boolean; services: any[]; error?: string }> {
    try {
      if (!this.config) {
        return { success: false, services: [], error: 'SuperFrete não configurado' };
      }

      const services = await this.makeRequest<any[]>('/shipping/services');
      return { success: true, services };
    } catch (error) {
      console.error('SuperFrete get services error:', error);
      return { 
        success: false, 
        services: [], 
        error: error instanceof Error ? error.message : 'Erro ao buscar serviços' 
      };
    }
  }

  async createShippingLabel(
    orderData: {
      from: SuperFreteAddress;
      to: SuperFreteAddress;
      products: SuperFreteProduct[];
      service: string;
    }
  ): Promise<{ success: boolean; label?: any; error?: string }> {
    try {
      if (!this.config) {
        return { success: false, error: 'SuperFrete não configurado' };
      }

      const requestData = {
        ...orderData,
        options: {
          insurance_value: orderData.products.reduce((sum, p) => sum + (p.unitary_value * p.quantity), 0),
          receipt: false,
          own_hand: false,
          collect: false,
          validate: true,
        },
      };

      const label = await this.makeRequest<any>('/shipping/label', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      return { success: true, label };
    } catch (error) {
      console.error('SuperFrete create label error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao criar etiqueta' 
      };
    }
  }

  async trackShipping(trackingCode: string): Promise<{ success: boolean; tracking?: any; error?: string }> {
    try {
      if (!this.config) {
        return { success: false, error: 'SuperFrete não configurado' };
      }

      const tracking = await this.makeRequest<any>(`/shipping/tracking/${trackingCode}`);
      return { success: true, tracking };
    } catch (error) {
      console.error('SuperFrete tracking error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao rastrear envio' 
      };
    }
  }

  isConfigured(): boolean {
    return this.config !== null;
  }
}

export const superfrete = new SuperFreteService();
