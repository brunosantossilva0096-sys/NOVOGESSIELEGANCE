import type { Product, User, Order, Payment, Category, ShippingMethod, StoreConfig } from '../types';

const DB_NAME = 'GessiEleganceDB';
const DB_VERSION = 1;

export class DatabaseService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Products store
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('categoryId', 'categoryId', { unique: false });
          productStore.createIndex('isActive', 'isActive', { unique: false });
          productStore.createIndex('name', 'name', { unique: false });
        }

        // Users store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
          userStore.createIndex('role', 'role', { unique: false });
          userStore.createIndex('resetToken', 'resetToken', { unique: false });
        }

        // Orders store
        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
          orderStore.createIndex('userId', 'userId', { unique: false });
          orderStore.createIndex('status', 'status', { unique: false });
          orderStore.createIndex('paymentStatus', 'paymentStatus', { unique: false });
          orderStore.createIndex('orderNumber', 'orderNumber', { unique: true });
          orderStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Payments store
        if (!db.objectStoreNames.contains('payments')) {
          const paymentStore = db.createObjectStore('payments', { keyPath: 'id' });
          paymentStore.createIndex('orderId', 'orderId', { unique: false });
          paymentStore.createIndex('userId', 'userId', { unique: false });
          paymentStore.createIndex('asaasPaymentId', 'asaasPaymentId', { unique: false });
        }

        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          const categoryStore = db.createObjectStore('categories', { keyPath: 'id' });
          categoryStore.createIndex('slug', 'slug', { unique: true });
          categoryStore.createIndex('parentId', 'parentId', { unique: false });
          categoryStore.createIndex('order', 'order', { unique: false });
        }

        // Shipping Methods store
        if (!db.objectStoreNames.contains('shippingMethods')) {
          const shippingStore = db.createObjectStore('shippingMethods', { keyPath: 'id' });
          shippingStore.createIndex('isActive', 'isActive', { unique: false });
        }

        // Store Config
        if (!db.objectStoreNames.contains('storeConfig')) {
          db.createObjectStore('storeConfig', { keyPath: 'id' });
        }

        // Cart (session-based)
        if (!db.objectStoreNames.contains('carts')) {
          const cartStore = db.createObjectStore('carts', { keyPath: 'userId' });
        }
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // Generic CRUD operations
  private async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  private async getById<T>(storeName: string, id: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  }

  private async add<T>(storeName: string, data: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.add(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async put<T>(storeName: string, data: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async delete(storeName: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  private async getOneByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const index = store.index(indexName);
      const request = index.get(value);
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  }

  // Products
  async getAllProducts(): Promise<Product[]> {
    return this.getAll<Product>('products');
  }

  async getActiveProducts(): Promise<Product[]> {
    const all = await this.getAll<Product>('products');
    return all.filter(p => p.isActive);
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.getById<Product>('products', id);
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return this.getByIndex<Product>('products', 'categoryId', categoryId);
  }

  async addProduct(product: Product): Promise<void> {
    return this.add('products', product);
  }

  async updateProduct(product: Product): Promise<void> {
    return this.put('products', { ...product, updatedAt: new Date().toISOString() });
  }

  async deleteProduct(id: string): Promise<void> {
    return this.delete('products', id);
  }

  // Users
  async getAllUsers(): Promise<User[]> {
    return this.getAll<User>('users');
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getById<User>('users', id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.getOneByIndex<User>('users', 'email', email.toLowerCase());
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    return this.getOneByIndex<User>('users', 'resetToken', token);
  }

  async addUser(user: User): Promise<void> {
    return this.add('users', { ...user, email: user.email.toLowerCase() });
  }

  async updateUser(user: User): Promise<void> {
    return this.put('users', { ...user, updatedAt: new Date().toISOString() });
  }

  async deleteUser(id: string): Promise<void> {
    return this.delete('users', id);
  }

  // Orders
  async getAllOrders(): Promise<Order[]> {
    return this.getAll<Order>('orders');
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    return this.getById<Order>('orders', id);
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    return this.getOneByIndex<Order>('orders', 'orderNumber', orderNumber);
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return this.getByIndex<Order>('orders', 'userId', userId);
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return this.getByIndex<Order>('orders', 'status', status);
  }

  async addOrder(order: Order): Promise<void> {
    return this.add('orders', order);
  }

  async updateOrder(order: Order): Promise<void> {
    return this.put('orders', { ...order, updatedAt: new Date().toISOString() });
  }

  // Payments
  async getAllPayments(): Promise<Payment[]> {
    return this.getAll<Payment>('payments');
  }

  async getPaymentById(id: string): Promise<Payment | undefined> {
    return this.getById<Payment>('payments', id);
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | undefined> {
    const payments = await this.getByIndex<Payment>('payments', 'orderId', orderId);
    return payments[0];
  }

  async getPaymentByAsaasId(asaasId: string): Promise<Payment | undefined> {
    return this.getOneByIndex<Payment>('payments', 'asaasPaymentId', asaasId);
  }

  async addPayment(payment: Payment): Promise<void> {
    return this.add('payments', payment);
  }

  async updatePayment(payment: Payment): Promise<void> {
    return this.put('payments', { ...payment, updatedAt: new Date().toISOString() });
  }

  // Categories
  async getAllCategories(): Promise<Category[]> {
    return this.getAll<Category>('categories');
  }

  async getActiveCategories(): Promise<Category[]> {
    const all = await this.getAllCategories();
    return all.filter(c => c.isActive).sort((a, b) => a.order - b.order);
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    return this.getById<Category>('categories', id);
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    return this.getOneByIndex<Category>('categories', 'slug', slug);
  }

  async addCategory(category: Category): Promise<void> {
    return this.add('categories', category);
  }

  async updateCategory(category: Category): Promise<void> {
    return this.put('categories', category);
  }

  async deleteCategory(id: string): Promise<void> {
    return this.delete('categories', id);
  }

  // Shipping Methods
  async getAllShippingMethods(): Promise<ShippingMethod[]> {
    return this.getAll<ShippingMethod>('shippingMethods');
  }

  async getActiveShippingMethods(): Promise<ShippingMethod[]> {
    const all = await this.getAll<ShippingMethod>('shippingMethods');
    return all.filter(m => m.isActive);
  }

  async getShippingMethodById(id: string): Promise<ShippingMethod | undefined> {
    return this.getById<ShippingMethod>('shippingMethods', id);
  }

  async addShippingMethod(method: ShippingMethod): Promise<void> {
    return this.add('shippingMethods', method);
  }

  async updateShippingMethod(method: ShippingMethod): Promise<void> {
    return this.put('shippingMethods', method);
  }

  async deleteShippingMethod(id: string): Promise<void> {
    return this.delete('shippingMethods', id);
  }

  // Store Config
  async getStoreConfig(): Promise<StoreConfig | undefined> {
    const configs = await this.getAll<StoreConfig>('storeConfig');
    return configs[0];
  }

  async saveStoreConfig(config: StoreConfig): Promise<void> {
    return this.put('storeConfig', { ...config, updatedAt: new Date().toISOString() });
  }

  // Cart persistence
  async getCart(userId: string): Promise<unknown> {
    return this.getById('carts', userId);
  }

  async saveCart(userId: string, cart: unknown): Promise<void> {
    return this.put('carts', { userId, data: cart, updatedAt: new Date().toISOString() });
  }

  async clearCart(userId: string): Promise<void> {
    return this.delete('carts', userId);
  }

  // Initialize with sample data
  async seedInitialData(): Promise<void> {
    const existingCategories = await this.getAllCategories();
    if (existingCategories.length > 0) return;

    // Sample categories
    const categories: Category[] = [
      { id: 'cat-1', name: 'Vestidos', slug: 'vestidos', description: 'Vestidos elegantes para todas as ocasiões', order: 1, isActive: true, createdAt: new Date().toISOString() },
      { id: 'cat-2', name: 'Blusas', slug: 'blusas', description: 'Blusas e camisas femininas', order: 2, isActive: true, createdAt: new Date().toISOString() },
      { id: 'cat-3', name: 'Calças', slug: 'calcas', description: 'Calças e leggings', order: 3, isActive: true, createdAt: new Date().toISOString() },
      { id: 'cat-4', name: 'Saias', slug: 'saias', description: 'Saias de todos os estilos', order: 4, isActive: true, createdAt: new Date().toISOString() },
      { id: 'cat-5', name: 'Acessórios', slug: 'acessorios', description: 'Bolsas, cintos e acessórios', order: 5, isActive: true, createdAt: new Date().toISOString() }
    ];

    for (const cat of categories) {
      await this.addCategory(cat);
    }

    // Sample shipping methods
    const shippingMethods: ShippingMethod[] = [
      { id: 'ship-1', name: 'Correios PAC', type: 'correios', provider: 'correios', cost: 15.90, estimatedDays: '7-10 dias úteis', isActive: true },
      { id: 'ship-2', name: 'Correios SEDEX', type: 'correios', provider: 'correios', cost: 29.90, estimatedDays: '2-3 dias úteis', isActive: true },
      { id: 'ship-3', name: 'Retirada na Loja', type: 'retirada', cost: 0, estimatedDays: 'Disponível em 24h', isActive: true },
      { id: 'ship-4', name: 'Entrega Local (Motoboy)', type: 'motoboy', cost: 12.00, estimatedDays: 'Mesmo dia', isActive: true }
    ];

    for (const method of shippingMethods) {
      await this.addShippingMethod(method);
    }

    // Sample products
    const products: Product[] = [
      {
        id: 'prod-1',
        name: 'Vestido Midi Elegance',
        description: 'Vestido midi em crepe de alta qualidade. Caimento perfeito para ocasiões especiais.',
        price: 299.90,
        promotionalPrice: 249.90,
        images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600'],
        category: 'Vestidos',
        categoryId: 'cat-1',
        stock: 15,
        sizes: ['PP', 'P', 'M', 'G', 'GG'],
        colors: [
          { name: 'Preto', hex: '#000000' },
          { name: 'Vinho', hex: '#722F37' },
          { name: 'Azul Marinho', hex: '#1B3A5F' }
        ],
        tags: ['midi', 'elegante', 'festa'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-2',
        name: 'Blusa de Seda Premium',
        description: 'Blusa em seda pura com acabamento impecável. Toque suave e caimento fluido.',
        price: 189.90,
        images: ['https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=600'],
        category: 'Blusas',
        categoryId: 'cat-2',
        stock: 20,
        sizes: ['PP', 'P', 'M', 'G'],
        colors: [
          { name: 'Branco', hex: '#FFFFFF' },
          { name: 'Creme', hex: '#F5F5DC' },
          { name: 'Rosa Antigo', hex: '#D4A5A5' }
        ],
        tags: ['seda', 'premium', 'workwear'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-3',
        name: 'Calça Wide Leg Linho',
        description: 'Calça wide leg em linho natural. Conforto e estilo para o dia a dia.',
        price: 229.90,
        promotionalPrice: 199.90,
        images: ['https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600'],
        category: 'Calças',
        categoryId: 'cat-3',
        stock: 12,
        sizes: ['34', '36', '38', '40', '42', '44'],
        colors: [
          { name: 'Natural', hex: '#E8DCC4' },
          { name: 'Bege', hex: '#C4A77D' },
          { name: 'Preto', hex: '#000000' }
        ],
        tags: ['linho', 'wide-leg', 'casual'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const product of products) {
      await this.addProduct(product);
    }
  }
}

export const db = new DatabaseService();
