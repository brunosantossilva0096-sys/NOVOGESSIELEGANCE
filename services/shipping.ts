import { db } from './database';
import { melhorEnvio } from './melhorEnvio';
import { superfrete } from './superfrete';
import type { ShippingMethod, ShippingQuote } from '../types';

// Brazilian states for region-based shipping
const BRAZILIAN_STATES = [
  { code: 'AC', name: 'Acre', region: 'norte' },
  { code: 'AL', name: 'Alagoas', region: 'nordeste' },
  { code: 'AP', name: 'Amapá', region: 'norte' },
  { code: 'AM', name: 'Amazonas', region: 'norte' },
  { code: 'BA', name: 'Bahia', region: 'nordeste' },
  { code: 'CE', name: 'Ceará', region: 'nordeste' },
  { code: 'DF', name: 'Distrito Federal', region: 'centro-oeste' },
  { code: 'ES', name: 'Espírito Santo', region: 'sudeste' },
  { code: 'GO', name: 'Goiás', region: 'centro-oeste' },
  { code: 'MA', name: 'Maranhão', region: 'nordeste' },
  { code: 'MT', name: 'Mato Grosso', region: 'centro-oeste' },
  { code: 'MS', name: 'Mato Grosso do Sul', region: 'centro-oeste' },
  { code: 'MG', name: 'Minas Gerais', region: 'sudeste' },
  { code: 'PA', name: 'Pará', region: 'norte' },
  { code: 'PB', name: 'Paraíba', region: 'nordeste' },
  { code: 'PR', name: 'Paraná', region: 'sul' },
  { code: 'PE', name: 'Pernambuco', region: 'nordeste' },
  { code: 'PI', name: 'Piauí', region: 'nordeste' },
  { code: 'RJ', name: 'Rio de Janeiro', region: 'sudeste' },
  { code: 'RN', name: 'Rio Grande do Norte', region: 'nordeste' },
  { code: 'RS', name: 'Rio Grande do Sul', region: 'sul' },
  { code: 'RO', name: 'Rondônia', region: 'norte' },
  { code: 'RR', name: 'Roraima', region: 'norte' },
  { code: 'SC', name: 'Santa Catarina', region: 'sul' },
  { code: 'SP', name: 'São Paulo', region: 'sudeste' },
  { code: 'SE', name: 'Sergipe', region: 'nordeste' },
  { code: 'TO', name: 'Tocantins', region: 'norte' },
];

interface CepInfo {
  cep: string;
  street?: string;
  neighborhood?: string;
  city: string;
  state: string;
  region?: string;
  error?: string;
}

class ShippingService {
  private superfreteConfigured = false;

  // Configure SuperFrete
  configureSuperFrete(token: string, sandbox: boolean = false) {
    superfrete.configure(token, sandbox);
    this.superfreteConfigured = true;
  }
  // Consult CEP using ViaCEP API
  async consultCep(cep: string): Promise<CepInfo> {
    try {
      const cleanCep = cep.replace(/\D/g, '');
      if (cleanCep.length !== 8) {
        return { cep: cleanCep, city: '', state: '', error: 'CEP inválido' };
      }

      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        return { cep: cleanCep, city: '', state: '', error: 'CEP não encontrado' };
      }

      const stateInfo = BRAZILIAN_STATES.find(s => s.code === data.uf);

      return {
        cep: cleanCep,
        street: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf,
        region: stateInfo?.region,
      };
    } catch (error) {
      console.error('CEP consultation error:', error);
      return { cep, city: '', state: '', error: 'Erro ao consultar CEP' };
    }
  }

  // Calculate shipping for a given CEP and order value
  async calculateShipping(
    cep: string,
    orderValue: number = 0,
    weight: number = 1,
    dimensions?: { height: number; width: number; length: number }
  ): Promise<{ success: boolean; quotes: ShippingQuote[]; error?: string }> {
    try {
      const cepInfo = await this.consultCep(cep);
      if (cepInfo.error) {
        return { success: false, quotes: [], error: cepInfo.error };
      }

      // Try SuperFrete API first (prioridade)
      if (this.superfreteConfigured) {
        const products = [{
          name: 'Produtos',
          quantity: 1,
          value: orderValue,
          weight: weight,
          dimensions: dimensions || { height: 10, width: 10, length: 10 }
        }];

        const superfreteResult = await superfrete.calculateShipping(
          '65058619', // CEP de origem
          cep,
          products,
          {
            insuranceValue: orderValue,
            receipt: false,
            ownHand: false,
            collect: false
          }
        );

        if (superfreteResult.success && superfreteResult.quotes.length > 0) {
          // Apply free shipping if applicable
          const storeConfig = await db.getStoreConfig();
          if (storeConfig.shippingConfig?.freeShippingAbove && orderValue >= storeConfig.shippingConfig.freeShippingAbove) {
            superfreteResult.quotes.forEach(quote => {
              quote.cost = 0;
              quote.method.cost = 0;
            });
          }

          return {
            success: true,
            quotes: superfreteResult.quotes,
          };
        }
      }

      // Try Melhor Envio API as second option
      const storeConfig = await db.getStoreConfig();
      if (storeConfig?.melhorEnvioConfig?.apiKey) {
        melhorEnvio.configure(
          storeConfig.melhorEnvioConfig.apiKey,
          storeConfig.melhorEnvioConfig.sandbox
        );

        const melhorEnvioQuotes = await melhorEnvio.calculateShipping(
          storeConfig.shippingConfig?.zipOrigin || '01001000', // Default to São Paulo
          cep,
          weight,
          dimensions
        );

        // Apply free shipping if applicable
        if (storeConfig.shippingConfig?.freeShippingAbove && orderValue >= storeConfig.shippingConfig.freeShippingAbove) {
          melhorEnvioQuotes.forEach(quote => {
            quote.cost = 0;
            quote.method.cost = 0;
          });
        }

        return {
          success: true,
          quotes: melhorEnvioQuotes,
        };
      }

      // Fallback to manual shipping methods
      const methods = await db.getActiveShippingMethods();
      const quotes: ShippingQuote[] = [];

      for (const method of methods) {
        const quote = await this.calculateMethodQuote(method, orderValue, cepInfo, weight, dimensions);
        if (quote) {
          quotes.push(quote);
        }
      }

      // Sort by cost
      quotes.sort((a, b) => a.cost - b.cost);

      return { success: true, quotes };
    } catch (error) {
      console.error('Shipping calculation error:', error);
      return { success: false, quotes: [], error: 'Erro ao calcular frete' };
    }
  }

  private async calculateMethodQuote(
    method: ShippingMethod,
    orderValue: number,
    cepInfo: CepInfo,
    weight: number,
    dimensions?: { height: number; width: number; length: number }
  ): Promise<ShippingQuote | null> {
    let cost = method.cost;

    // Apply free shipping threshold
    if (method.config?.freeShippingAbove && orderValue >= method.config.freeShippingAbove) {
      cost = 0;
    }

    // Apply region-based pricing
    if (method.config?.regionCosts && cepInfo.region) {
      const regionCost = method.config.regionCosts.find(r =>
        r.region.toLowerCase() === cepInfo.region?.toLowerCase()
      );
      if (regionCost) {
        cost = regionCost.cost;
      }
    }

    // Calculate estimated delivery date
    const estimatedDate = this.calculateEstimatedDate(method.estimatedDays);

    return {
      method,
      cost,
      estimatedDays: method.estimatedDays,
    };
  }

  private calculateEstimatedDate(estimatedDays: string): Date | undefined {
    try {
      // Parse "2-3 dias úteis" or "7-10 dias úteis"
      const match = estimatedDays.match(/(\d+)(?:-(\d+))?/);
      if (match) {
        const minDays = parseInt(match[1]);
        const date = new Date();
        date.setDate(date.getDate() + minDays);
        return date;
      }
    } catch {
      // Ignore parsing errors
    }
    return undefined;
  }

  // Get all shipping methods
  async getShippingMethods(): Promise<ShippingMethod[]> {
    return db.getAllShippingMethods();
  }

  async getActiveShippingMethods(): Promise<ShippingMethod[]> {
    return db.getActiveShippingMethods();
  }

  // Admin: CRUD operations
  async createShippingMethod(method: Omit<ShippingMethod, 'id'>): Promise<{ success: boolean; method?: ShippingMethod; error?: string }> {
    try {
      const newMethod: ShippingMethod = {
        ...method,
        id: `ship-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      await db.addShippingMethod(newMethod);
      return { success: true, method: newMethod };
    } catch (error) {
      console.error('Create shipping method error:', error);
      return { success: false, error: 'Erro ao criar método de envio' };
    }
  }

  async updateShippingMethod(method: ShippingMethod): Promise<{ success: boolean; error?: string }> {
    try {
      await db.updateShippingMethod(method);
      return { success: true };
    } catch (error) {
      console.error('Update shipping method error:', error);
      return { success: false, error: 'Erro ao atualizar método de envio' };
    }
  }

  async deleteShippingMethod(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await db.deleteShippingMethod(id);
      return { success: true };
    } catch (error) {
      console.error('Delete shipping method error:', error);
      return { success: false, error: 'Erro ao remover método de envio' };
    }
  }

  // Validate if shipping is available for a location
  async validateShippingAvailability(cep: string, methodId: string): Promise<{ available: boolean; message?: string }> {
    const method = await db.getShippingMethodById(methodId);
    if (!method || !method.isActive) {
      return { available: false, message: 'Método de envio não disponível' };
    }

    if (method.type === 'retirada') {
      return { available: true, message: 'Retirada disponível em nossa loja' };
    }

    const cepInfo = await this.consultCep(cep);
    if (cepInfo.error) {
      return { available: false, message: cepInfo.error };
    }

    return { available: true };
  }

  // Format address for display
  formatAddress(address: { street: string; number: string; complement?: string; neighborhood: string; city: string; state: string; zip: string }): string {
    const parts = [
      `${address.street}, ${address.number}`,
      address.complement,
      address.neighborhood,
      `${address.city} - ${address.state}`,
      address.zip,
    ].filter(Boolean);

    return parts.join(' - ');
  }

  // Get region from state code
  getRegionFromState(stateCode: string): string | undefined {
    const state = BRAZILIAN_STATES.find(s => s.code === stateCode.toUpperCase());
    return state?.region;
  }
}

export const shippingService = new ShippingService();
