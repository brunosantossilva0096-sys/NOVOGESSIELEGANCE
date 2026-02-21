import { supabase } from './supabase';
import type { Product, User, Order, Category, ShippingMethod, StoreConfig } from '../types';

export class DatabaseService {
  async init(): Promise<void> {
    // Supabase doesn't need client-side initialization after setup
    return Promise.resolve();
  }

  // Storage
  async uploadProductImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('products')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  // Products
  async getAllProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)');

    if (error) throw error;
    return (data || []).map(p => this.mapProduct(p));
  }

  async getActiveProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('is_active', true);

    if (error) throw error;
    return (data || []).map(p => this.mapProduct(p));
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('id', id)
      .single();

    if (error) return undefined;
    return this.mapProduct(data);
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('category_id', categoryId);

    if (error) throw error;
    return (data || []).map(p => this.mapProduct(p));
  }

  async addProduct(product: Product): Promise<void> {
    const { error } = await supabase
      .from('products')
      .insert(this.mapProductToDb(product));

    if (error) throw error;
  }

  async updateProduct(product: Product): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update(this.mapProductToDb(product))
      .eq('id', product.id);

    if (error) throw error;
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Users (Profiles)
  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) throw error;
    return (data || []).map(u => this.mapUser(u));
  }

  async getUserById(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return undefined;
    return this.mapUser(data);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error) return undefined;
    return this.mapUser(data);
  }

  async addUser(user: User): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .insert(this.mapUserToDb(user));

    if (error) throw error;
  }

  async updateUser(user: User): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(this.mapUserToDb(user))
      .eq('id', user.id);

    if (error) throw error;
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Orders
  async getAllOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)');

    if (error) throw error;
    return (data || []).map(o => this.mapOrder(o));
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .single();

    if (error) return undefined;
    return this.mapOrder(data);
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('order_number', orderNumber)
      .single();

    if (error) return undefined;
    return this.mapOrder(data);
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId);

    if (error) throw error;
    return (data || []).map(o => this.mapOrder(o));
  }

  async addOrder(order: Order): Promise<void> {
    const { error: orderError } = await supabase
      .from('orders')
      .insert(this.mapOrderToDb(order));

    if (orderError) throw orderError;

    const items = order.items.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      name: item.name,
      price: item.promotionalPrice || item.price,
      quantity: item.quantity,
      size: item.size,
      color: item.color
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(items);

    if (itemsError) throw itemsError;
  }

  async updateOrder(order: Order): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update(this.mapOrderToDb(order))
      .eq('id', order.id);

    if (error) throw error;
  }

  // Categories
  async getAllCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('order', { ascending: true });

    if (error) throw error;
    return (data || []).map(c => this.mapCategory(c));
  }

  async getActiveCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('order', { ascending: true });

    if (error) throw error;
    return (data || []).map(c => this.mapCategory(c));
  }

  async addCategory(category: Category): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .insert(this.mapCategoryToDb(category));

    if (error) throw error;
  }

  async updateCategory(category: Category): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .update(this.mapCategoryToDb(category))
      .eq('id', category.id);

    if (error) throw error;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Store Config
  async getStoreConfig(): Promise<StoreConfig | undefined> {
    // We assume there's only one config record in public config
    // (This would ideally be in a public table or fetched via function)
    const { data, error } = await supabase
      .from('categories') // Placeholder as we didn't create a config table yet
      .select('*')
      .limit(1)
      .maybeSingle();

    return undefined; // TODO: Implement store_config table if needed
  }

  // Mapping Helpers
  private mapProduct(p: any): Product {
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      costPrice: p.cost_price ? Number(p.cost_price) : undefined,
      promotionalPrice: p.promotional_price ? Number(p.promotional_price) : undefined,
      images: p.images || [],
      category: p.categories?.name || '',
      categoryId: p.category_id,
      stock: p.stock,
      minStock: p.min_stock,
      sizes: p.sizes || [],
      colors: p.colors || [],
      tags: p.tags || [],
      isActive: p.is_active,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    };
  }

  private mapProductToDb(p: Product) {
    return {
      name: p.name,
      description: p.description,
      price: p.price,
      cost_price: p.costPrice,
      promotional_price: p.promotionalPrice,
      images: p.images,
      category_id: p.categoryId,
      stock: p.stock,
      min_stock: p.minStock,
      sizes: p.sizes,
      colors: p.colors,
      tags: p.tags,
      is_active: p.isActive
    };
  }

  private mapUser(u: any): User {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      cpf: u.cpf,
      phone: u.phone,
      addresses: u.addresses || [],
      role: u.role,
      isActive: u.is_active,
      createdAt: u.created_at,
      updatedAt: u.updated_at
    };
  }

  private mapUserToDb(u: User) {
    return {
      name: u.name,
      email: u.email,
      cpf: u.cpf,
      phone: u.phone,
      role: u.role,
      is_active: u.isActive
    };
  }

  private mapOrder(o: any): Order {
    return {
      id: o.id,
      orderNumber: o.order_number,
      userId: o.user_id,
      userName: o.user_name,
      userEmail: o.user_email,
      userPhone: o.user_phone,
      total: Number(o.total),
      subtotal: Number(o.subtotal),
      shippingCost: Number(o.shipping_cost),
      discount: Number(o.discount),
      status: o.status,
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      paymentId: o.payment_id,
      paymentQrCode: o.payment_qr_code,
      paymentLink: o.payment_link,
      shippingMethod: o.shipping_method,
      shippingAddress: o.shipping_address,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
      items: (o.order_items || []).map((i: any) => ({
        productId: i.product_id,
        name: i.name,
        price: Number(i.price),
        quantity: i.quantity,
        size: i.size,
        color: i.color
      }))
    };
  }

  private mapOrderToDb(o: Order) {
    return {
      order_number: o.orderNumber,
      user_id: o.userId,
      user_name: o.userName,
      user_email: o.userEmail,
      user_phone: o.userPhone,
      subtotal: o.subtotal,
      shipping_cost: o.shippingCost,
      discount: o.discount,
      total: o.total,
      status: o.status,
      payment_method: o.paymentMethod,
      payment_status: o.paymentStatus,
      payment_id: o.paymentId,
      payment_qr_code: o.paymentQrCode,
      payment_link: o.paymentLink,
      shipping_method: o.shippingMethod,
      shipping_address: o.shippingAddress,
      tracking_code: o.trackingCode,
      notes: o.notes
    };
  }

  private mapCategory(c: any): Category {
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      order: c.order,
      isActive: c.is_active,
      createdAt: c.created_at
    };
  }

  private mapCategoryToDb(c: Category) {
    return {
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      order: c.order,
      is_active: c.isActive
    };
  }
}

export const db = new DatabaseService();
