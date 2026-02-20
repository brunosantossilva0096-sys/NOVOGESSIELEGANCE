import type { ShippingQuote, ShippingMethod } from '../types';

// Melhor Envio API Integration
// Documentation: https://melhorenvio.com.br/documentacao

const MELHOR_ENVIO_API_URL = 'https://api.melhorenvio.com.br';
const MELHOR_ENVIO_SANDBOX_URL = 'https://sandbox.melhorenvio.com.br';

interface MelhorEnvioAddress {
  postal_code: string;
}

interface MelhorEnvioPackage {
  height: number;
  width: number;
  length: number;
  weight: number;
}

interface MelhorEnvioQuoteRequest {
  from: MelhorEnvioAddress;
  to: MelhorEnvioAddress;
  package: MelhorEnvioPackage;
  options?: {
    receipt?: boolean;
    own_hand?: boolean;
    collect?: boolean;
  };
}

interface MelhorEnvioQuoteResponse {
  id: number;
  name: string;
  price: string;
  custom_price: string;
  discount: string;
  currency: string;
  delivery_time: number;
  delivery_range: {
    min: number;
    max: number;
  };
  custom_delivery_time: number;
  custom_delivery_range: {
    min: number;
    max: number;
  };
  packages: {
    price: string;
    discount: string;
    format: string;
    dimensions: {
      height: number;
      width: number;
      length: number;
    };
    weight: string;
    insurance_value: string;
    products: {
      name: string;
      quantity: number;
      unitary_value: string;
    }[];
  }[];
  additional_services: {
    receipt: boolean;
    own_hand: boolean;
    collect: boolean;
  };
  company: {
    id: number;
    name: string;
    picture: string;
  };
}

class MelhorEnvioService {
  private apiKey: string = '';
  private sandbox: boolean = true;
  private baseUrl: string = MELHOR_ENVIO_SANDBOX_URL;

  configure(apiKey: string, sandbox: boolean = true) {
    this.apiKey = apiKey;
    this.sandbox = sandbox;
    this.baseUrl = sandbox ? MELHOR_ENVIO_SANDBOX_URL : MELHOR_ENVIO_API_URL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Melhor Envio API key not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'User-Agent': 'GessiElegance (contato@gessielegance.com.br)',
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Melhor Envio API error: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Melhor Envio request failed:', error);
      throw error;
    }
  }

  // Calculate shipping quote
  async calculateShipping(
    fromZip: string,
    toZip: string,
    weight: number = 1, // kg
    dimensions: { height: number; width: number; length: number } = { height: 10, width: 15, length: 20 }
  ): Promise<ShippingQuote[]> {
    try {
      const body: MelhorEnvioQuoteRequest = {
        from: { postal_code: fromZip.replace(/\D/g, '') },
        to: { postal_code: toZip.replace(/\D/g, '') },
        package: {
          height: dimensions.height,
          width: dimensions.width,
          length: dimensions.length,
          weight: weight,
        },
      };

      const quotes = await this.request<MelhorEnvioQuoteResponse[]>('/api/v2/me/shipment/calculate', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return quotes.map(quote => this.mapQuoteToShippingQuote(quote));
    } catch (error) {
      console.error('Failed to calculate shipping:', error);
      // Return fallback quotes if API fails
      return this.getFallbackQuotes();
    }
  }

  private mapQuoteToShippingQuote(quote: MelhorEnvioQuoteResponse): ShippingQuote {
    const price = parseFloat(quote.price);
    const deliveryDays = quote.delivery_range.max || quote.delivery_time;

    // Map company names to our format
    const companyMap: Record<string, ShippingMethod['type']> = {
      'Correios': 'correios',
      'Jadlog': 'jadlog',
      'Loggi': 'loggi',
      'Azul Cargo Express': 'azul',
      'LATAM Cargo': 'latam',
      'Buslog': 'buslog',
    };

    return {
      method: {
        id: quote.company.id.toString(),
        name: quote.name,
        type: companyMap[quote.company.name] || 'other',
        cost: price,
        estimatedDays: `${quote.delivery_range.min || quote.delivery_time}-${deliveryDays} dias úteis`,
        isActive: true,
      },
      cost: price,
      estimatedDays: `${quote.delivery_range.min || quote.delivery_time}-${deliveryDays} dias úteis`,
    };
  }

  // Get available shipping methods
  async getShippingMethods(): Promise<ShippingMethod[]> {
    try {
      const companies = await this.request<Array<{
        id: number;
        name: string;
        picture: string;
      }>>('/api/v2/companies');

      return companies.map(company => ({
        id: company.id.toString(),
        name: company.name,
        type: this.mapCompanyType(company.name) as ShippingMethod['type'],
        cost: 0,
        estimatedDays: '',
        isActive: true,
      }));
    } catch (error) {
      console.error('Failed to get shipping methods:', error);
      return this.getFallbackMethods();
    }
  }

  private mapCompanyType(companyName: string): ShippingMethod['type'] {
    const typeMap: Record<string, ShippingMethod['type']> = {
      'Correios': 'correios',
      'Jadlog': 'jadlog',
      'Loggi': 'loggi',
      'Azul Cargo Express': 'azul',
      'LATAM Cargo': 'latam',
      'Buslog': 'buslog',
    };
    return typeMap[companyName] || 'other';
  }

  // Fallback quotes when API is not available
  private getFallbackQuotes(): ShippingQuote[] {
    return [
      {
        method: {
          id: 'correios-pac',
          name: 'PAC - Correios',
          type: 'correios',
          cost: 25.90,
          estimatedDays: '7-12 dias úteis',
          isActive: true,
        },
        cost: 25.90,
        estimatedDays: '7-12 dias úteis',
      },
      {
        method: {
          id: 'correios-sedex',
          name: 'SEDEX - Correios',
          type: 'correios',
          cost: 45.90,
          estimatedDays: '3-5 dias úteis',
          isActive: true,
        },
        cost: 45.90,
        estimatedDays: '3-5 dias úteis',
      },
      {
        method: {
          id: 'jadlog',
          name: 'Jadlog Express',
          type: 'jadlog',
          cost: 35.00,
          estimatedDays: '4-7 dias úteis',
          isActive: true,
        },
        cost: 35.00,
        estimatedDays: '4-7 dias úteis',
      },
    ];
  }

  // Fallback methods when API is not available
  private getFallbackMethods(): ShippingMethod[] {
    return [
      {
        id: 'correios-pac',
        name: 'PAC - Correios',
        type: 'correios',
        cost: 0,
        estimatedDays: '7-12 dias úteis',
        isActive: true,
      },
      {
        id: 'correios-sedex',
        name: 'SEDEX - Correios',
        type: 'correios',
        cost: 0,
        estimatedDays: '3-5 dias úteis',
        isActive: true,
      },
      {
        id: 'jadlog',
        name: 'Jadlog Express',
        type: 'jadlog',
        cost: 0,
        estimatedDays: '4-7 dias úteis',
        isActive: true,
      },
    ];
  }

  // Create a shipping order (requires authentication)
  async createShippingOrder(
    orderId: string,
    toAddress: {
      name: string;
      email: string;
      phone: string;
      address: string;
      number: string;
      complement?: string;
      city: string;
      state: string;
      zip: string;
    },
    items: Array<{
      name: string;
      quantity: number;
      unitary_value: number;
    }>,
    shippingServiceId: number
  ): Promise<{ success: boolean; trackingCode?: string; error?: string }> {
    try {
      const body = {
        service: shippingServiceId,
        from: {
          // Should be configured in Melhor Envio dashboard
        },
        to: {
          name: toAddress.name,
          email: toAddress.email,
          phone: toAddress.phone,
          document: '', // Required for some carriers
          address: toAddress.address,
          number: toAddress.number,
          complement: toAddress.complement || '',
          district: '',
          city: toAddress.city,
          state_abbr: toAddress.state,
          country_id: 'BR',
          postal_code: toAddress.zip.replace(/\D/g, ''),
        },
        products: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitary_value: item.unitary_value.toFixed(2),
        })),
        volumes: [
          {
            height: 10,
            width: 15,
            length: 20,
            weight: 1,
          },
        ],
        options: {
          insurance_value: items.reduce((sum, item) => sum + item.unitary_value * item.quantity, 0).toFixed(2),
          receipt: false,
          own_hand: false,
          reverse: false,
          non_commercial: true,
        },
      };

      const response = await this.request<{
        id: string;
        tracking?: string;
        protocol?: string;
      }>('/api/v2/me/orders', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return {
        success: true,
        trackingCode: response.tracking || response.protocol,
      };
    } catch (error) {
      console.error('Failed to create shipping order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create shipping order',
      };
    }
  }

  // Track shipment
  async trackShipment(trackingCode: string): Promise<{
    status: string;
    events: Array<{
      date: string;
      status: string;
      location: string;
    }>;
  }> {
    try {
      const response = await this.request<{
        tracking: string;
        events: Array<{
          date: string;
          status: string;
          location: string;
        }>;
      }>(`/api/v2/me/orders/${trackingCode}/tracking`);

      return {
        status: 'in_transit',
        events: response.events || [],
      };
    } catch (error) {
      console.error('Failed to track shipment:', error);
      return {
        status: 'unknown',
        events: [],
      };
    }
  }
}

export const melhorEnvio = new MelhorEnvioService();
