import { db } from './database';
import { auth } from './auth';
import { cartService } from './cart';
import { emailService } from './email';
import { melhorEnvio } from './melhorEnvio';
import type { StoreConfig } from '../types';

// Token Asaas de produção — também pode ser configurado via VITE_ASAAS_TOKEN
const ASAAS_PRODUCTION_TOKEN = import.meta.env.VITE_ASAAS_TOKEN || 'cb44adc0-3e19-4e11-b8e6-7c1a378642da';

const STORE_CONFIG_KEY = 'gessielegance_config';

const defaultStoreConfig: StoreConfig = {
  id: 'default',
  name: 'GessiElegance Moda',
  description: 'Moda elegante e sofisticada para todas as ocasiões',
  contactEmail: 'contato@gessielegance.com.br',
  contactPhone: '(11) 99999-9999',
  paymentConfig: {
    pixEnabled: true,
    creditCardEnabled: true,
    debitCardEnabled: true,
    boletoEnabled: false,
    maxInstallments: 6,
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
  // Initialize database
  await db.init();

  // Seed initial data if needed
  await db.seedInitialData();

  // Initialize auth
  await auth.init();

  // Create default admin account if no users exist
  await createDefaultAdminAccount();

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
    // Save default config
    await db.saveStoreConfig(defaultStoreConfig);
    emailService.configure(defaultStoreConfig.name, defaultStoreConfig.contactEmail);
  }

  console.log('✅ GessiElegance services initialized');
}

async function createDefaultAdminAccount(): Promise<void> {
  try {
    // Check if any admin user exists
    const allUsers = await db.getAllUsers();
    const hasAdmin = allUsers.some(u => u.role === 'admin');

    if (!hasAdmin) {
      // Create default admin account
      const adminUser = {
        id: 'admin-' + Date.now(),
        name: 'Administrador',
        email: 'admin@gessielegance.com',
        password: await hashPassword('admin123'),
        addresses: [],
        role: 'admin' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.addUser(adminUser);
      console.log('✅ Default admin account created:');
      console.log('   Email: admin@gessielegance.com');
      console.log('   Password: admin123');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
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
  await db.saveStoreConfig(updated);

  // Update email service if store info changed
  if (config.name || config.contactEmail) {
    emailService.configure(updated.name, updated.contactEmail);
  }
}
