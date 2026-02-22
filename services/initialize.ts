import { db } from './database';
import { auth } from './auth';
import { cartService } from './cart';
import { emailService } from './email';
import { melhorEnvio } from './melhorEnvio';
import { supabase } from './supabase';
import type { StoreConfig } from '../types';

// Token Asaas de produção — também pode ser configurado via VITE_ASAAS_TOKEN
const ASAAS_PRODUCTION_TOKEN = import.meta.env.VITE_ASAAS_TOKEN || 'cb44adc0-3e19-4e11-b8e6-7c1a378642da';

const STORE_CONFIG_KEY = 'gessielegance_config';

const defaultStoreConfig: StoreConfig = {
  id: 'default',
  name: 'GessiElegance Moda',
  description: 'Moda elegante e sofisticada para todas as ocasiões',
  contactEmail: 'gessianebelo1234@gmail.com',
  contactPhone: '(98) 98538-1823',
  paymentConfig: {
    pixEnabled: true,
    creditCardEnabled: true,
    debitCardEnabled: true,
    boletoEnabled: true,
    maxInstallments: 3,
    minInstallmentValue: 50,
  },
  melhorEnvioConfig: {
    apiKey: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiYTc4MTIzMTM2MjU2ZjExODU0YmQ4NjIxZDA4NWJkNzIxODZjYzA0YmNiNjU4M2E1NmI0ZGRhODg5Yjc0NzExNmUyNTYwY2U4NzVhOTBjZGQiLCJpYXQiOjE3NzE1NDQ5NzkuNDUzNTA4LCJuYmYiOjE3NzE1NDQ5NzkuNDUzNTA5LCJleHAiOjE4MDMwODA5NzkuNDQwOTE2LCJzdWIiOiJhMTFlZTQxOS02ZDhhLTQ0MzEtOTA2MC1mYzJmM2U2NjUzNzAiLCJzY29wZXMiOlsiY2FydC1yZWFkIiwiY2FydC13cml0ZSIsImNvbXBhbmllcy1yZWFkIiwiY29tcGFuaWVzLXdyaXRlIiwiY291cG9ucy1yZWFkIiwiY291cG9ucy13cml0ZSIsIm5vdGlmaWNhdGlvbnMtcmVhZCIsIm9yZGVycy1yZWFkIiwicHJvZHVjdHMtcmVhZCIsInByb2R1Y3RzLWRlc3Ryb3kiLCJwcm9kdWN0cy13cml0ZSIsInB1cmNoYXNlcy1yZWFkIiwic2hpcHBpbmctY2FsY3VsYXRlIiwic2hpcHBpbmctY2FuY2VsIiwic2hpcHBpbmctY2hlY2tvdXQiLCJzaGlwcGluZy1jb21wYW5pZXMiLCJzaGlwcGluZy1nZW5lcmF0ZSIsInNoaXBwaW5nLXByZXZpZXciLCJzaGlwcGluZy1wcmludCIsInNoaXBwaW5nLXNoYXJlIiwic2hpcHBpbmctdHJhY2tpbmciLCJlY29tbWVyY2Utc2hpcHBpbmciLCJ0cmFuc2FjdGlvbnMtcmVhZCIsInVzZXJzLXJlYWQiLCJ1c2Vycy13cml0ZSIsIndlYmhvb2tzLXJlYWQiLCJ3ZWJob29rcy13cml0ZSIsIndlYmhvb2tzLWRlbGV0ZSIsInRkZWFsZXItd2ViaG9vayJdfQ.BMskwfF4gGZJZIdpkEbxTywPkacZeYUnqavmSBSBkxOilHALF2bWzm5DRmiG_k6iPImj6J8y1zWGYNf8Zz0A3FGfvq4JovdAHzGZlcpVzLIdRyB7l9tdkIF6E8fdiL76l5FGEPqRf-Et7-tKdzdPjLh8Of5Nq-sOkURTUD8x9tHuDzLIsT9uieCoo227D9bPfp55A5Ai1zTydjNfrna7CnZuJ7aOxCHuTihvmwQHGqfi6QaMUqlWdU5uLJeI6q2ZBzsEmgxKmd0bYD6H9QEOKsg22vvgJAFm9OOlpmNkLtU6o-ofLiykKm8-N0lT3kEHRrGyfk1uHesyf3WdKaje7RApBOT5Qx-K1Vdx7kFCNKSlzMD6KfLuv6eg7qtdJc0pDsmAsiVzSuW9I78FjcXNcWBqYf53x0sJpzaEZrXBzt5yQvlGry-4Um4ru3oURABsM72uM0mu8q2lApP2DvQbsQ-oldjjKOdUf2Bro-cEKUl8MVDN0FQW0zi4jzQcJrxr6XOphDbclp4uD9e1NIGz3pA6-OCdsi7Yz1mVmnkr8VFpELRZlMBzjH3G8OuY1TM_2YWyDupp0hKrT1HqadJCUbg7RLmQ0NDI9_UY6ThV1Msks_GwSKHZkqVVypOe-T_nIEp1NAvQ6f0U4gdD8LcTcTQMn8jHSSSe6pnA8iWQtqU',
    sandbox: false,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function initializeServices(): Promise<void> {
  // Initialize database (noop in Supabase version but good to keep for consistency)
  await db.init();

  // Initialize auth (Restores session/profile from Supabase)
  await auth.init();

  // Initialize cart
  const currentUser = auth.getCurrentUser();
  cartService.init(currentUser?.id);

  // Initialize email service
  const storeConfig = await db.getStoreConfig();
  if (storeConfig) {
    emailService.configure(storeConfig.name, storeConfig.contactEmail);

    // Initialize Melhor Envio if configured
    if (storeConfig.melhorEnvioConfig?.apiKey) {
      melhorEnvio.configure(
        storeConfig.melhorEnvioConfig.apiKey,
        storeConfig.melhorEnvioConfig.sandbox
      );
      console.log('✅ Melhor Envio initialized');
    }
  } else {
    // Default config fallback
    emailService.configure(defaultStoreConfig.name, defaultStoreConfig.contactEmail);
  }

  console.log('✅ GessiElegance services initialized (Supabase)');
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getStoreConfig(): Promise<StoreConfig> {
  const config = await db.getStoreConfig();
  return config || defaultStoreConfig;
}

export async function updateStoreConfig(config: Partial<StoreConfig>): Promise<void> {
  const current = await getStoreConfig();
  const updated = { ...current, ...config, updatedAt: new Date().toISOString() };
  
  // Save to database
  const { error } = await supabase
    .from('store_config')
    .upsert({
      id: current.id === 'default' ? undefined : current.id,
      name: updated.name,
      description: updated.description,
      logo: updated.logo,
      contact_email: updated.contactEmail,
      contact_phone: updated.contactPhone,
      address: updated.address,
      social_links: updated.socialLinks,
      payment_config: updated.paymentConfig,
      melhor_envio_config: updated.melhorEnvioConfig,
      updated_at: updated.updatedAt,
    });

  if (error) {
    console.error('Error updating store config:', error);
    throw error;
  }

  console.log('Store config updated successfully:', updated);

  // Update email service if store info changed
  if (config.name || config.contactEmail) {
    emailService.configure(updated.name, updated.contactEmail);
  }
}
