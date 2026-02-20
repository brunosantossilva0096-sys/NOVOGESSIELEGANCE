import { OrderStatus, PaymentStatus } from '../types';
import { db } from './database';
import type { Order, CartItem, Address, ShippingMethod, PaymentMethod } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

// Gera número de pedido sequencial (#1, #2, #3...)
const generateOrderNumber = async (): Promise<string> => {
  const allOrders = await db.getAllOrders();
  const orderCount = allOrders.length;
  return (orderCount + 1).toString();
};

class OrderService {
  async createOrder(data: {
    userId: string;
    userName: string;
    userEmail: string;
    userPhone?: string;
    items: CartItem[];
    subtotal: number;
    shippingCost: number;
    discount: number;
    total: number;
    paymentMethod: PaymentMethod;
    shippingMethod: ShippingMethod;
    shippingAddress: Address;
    notes?: string;
  }): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      const orderNumber = await generateOrderNumber();
      const order: Order = {
        id: generateId(),
        orderNumber,
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        userPhone: data.userPhone,
        items: data.items,
        subtotal: data.subtotal,
        shippingCost: data.shippingCost,
        discount: data.discount,
        total: data.total,
        status: OrderStatus.PENDING,
        paymentMethod: data.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        shippingMethod: data.shippingMethod,
        shippingAddress: data.shippingAddress,
        notes: data.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.addOrder(order);

      // Update product stock
      for (const item of data.items) {
        const product = await db.getProductById(item.productId);
        if (product) {
          product.stock = Math.max(0, product.stock - item.quantity);
          await db.updateProduct(product);
        }
      }

      return { success: true, order };
    } catch (error) {
      console.error('Create order error:', error);
      return { success: false, error: 'Erro ao criar pedido' };
    }
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    return db.getOrderById(id);
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    return db.getOrderByNumber(orderNumber);
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return db.getOrdersByUser(userId);
  }

  async getAllOrders(): Promise<Order[]> {
    return db.getAllOrders();
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    trackingCode?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const order = await db.getOrderById(orderId);
      if (!order) {
        return { success: false, error: 'Pedido não encontrado' };
      }

      order.status = status;
      order.updatedAt = new Date().toISOString();

      if (trackingCode) {
        order.trackingCode = trackingCode;
      }

      if (status === OrderStatus.SHIPPED) {
        order.shippedAt = new Date().toISOString();
      } else if (status === OrderStatus.DELIVERED) {
        order.deliveredAt = new Date().toISOString();
      }

      await db.updateOrder(order);
      return { success: true };
    } catch (error) {
      console.error('Update order status error:', error);
      return { success: false, error: 'Erro ao atualizar pedido' };
    }
  }

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    paymentData?: {
      paymentId?: string;
      paymentQrCode?: string;
      paymentLink?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const order = await db.getOrderById(orderId);
      if (!order) {
        return { success: false, error: 'Pedido não encontrado' };
      }

      order.paymentStatus = paymentStatus;
      order.updatedAt = new Date().toISOString();

      if (paymentData?.paymentId) {
        order.paymentId = paymentData.paymentId;
      }
      if (paymentData?.paymentQrCode) {
        order.paymentQrCode = paymentData.paymentQrCode;
      }
      if (paymentData?.paymentLink) {
        order.paymentLink = paymentData.paymentLink;
      }

      // Update order status based on payment
      if (paymentStatus === PaymentStatus.CONFIRMED || paymentStatus === PaymentStatus.RECEIVED) {
        order.status = OrderStatus.PAID;
        order.paidAt = new Date().toISOString();
      } else if (paymentStatus === PaymentStatus.CANCELLED) {
        order.status = OrderStatus.CANCELLED;

        // Restore stock
        for (const item of order.items) {
          const product = await db.getProductById(item.productId);
          if (product) {
            product.stock += item.quantity;
            await db.updateProduct(product);
          }
        }
      } else if (paymentStatus === PaymentStatus.REFUNDED) {
        order.status = OrderStatus.REFUNDED;
      }

      await db.updateOrder(order);
      return { success: true };
    } catch (error) {
      console.error('Update payment status error:', error);
      return { success: false, error: 'Erro ao atualizar pagamento' };
    }
  }

  async cancelOrder(orderId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const order = await db.getOrderById(orderId);
      if (!order) {
        return { success: false, error: 'Pedido não encontrado' };
      }

      if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
        return { success: false, error: 'Não é possível cancelar pedido já enviado ou entregue' };
      }

      order.status = OrderStatus.CANCELLED;
      order.paymentStatus = PaymentStatus.CANCELLED;
      order.notes = reason ? `${order.notes || ''}\nCancelado: ${reason}`.trim() : order.notes;
      order.updatedAt = new Date().toISOString();

      // Restore stock
      for (const item of order.items) {
        const product = await db.getProductById(item.productId);
        if (product) {
          product.stock += item.quantity;
          await db.updateProduct(product);
        }
      }

      await db.updateOrder(order);
      return { success: true };
    } catch (error) {
      console.error('Cancel order error:', error);
      return { success: false, error: 'Erro ao cancelar pedido' };
    }
  }

  // Statistics
  async getDashboardStats(): Promise<{
    totalOrders: number;
    totalSales: number;
    ordersToday: number;
    salesToday: number;
    ordersThisMonth: number;
    salesThisMonth: number;
    ordersPending: number;
    ordersPaid: number;
    ordersShipped: number;
    recentOrders: Order[];
  }> {
    const allOrders = await db.getAllOrders();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const ordersToday = allOrders.filter(o => new Date(o.createdAt) >= today);
    const ordersThisMonth = allOrders.filter(o => new Date(o.createdAt) >= thisMonth);

    const totalSales = allOrders
      .filter(o => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + o.total, 0);

    const salesToday = ordersToday
      .filter(o => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + o.total, 0);

    const salesThisMonth = ordersThisMonth
      .filter(o => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + o.total, 0);

    const recentOrders = allOrders
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      totalOrders: allOrders.length,
      totalSales,
      ordersToday: ordersToday.length,
      salesToday,
      ordersThisMonth: ordersThisMonth.length,
      salesThisMonth,
      ordersPending: allOrders.filter(o => o.status === OrderStatus.PENDING).length,
      ordersPaid: allOrders.filter(o => o.status === OrderStatus.PAID).length,
      ordersShipped: allOrders.filter(o => o.status === OrderStatus.SHIPPED).length,
      recentOrders,
    };
  }

  async getTopProducts(limit: number = 5): Promise<{ productId: string; name: string; totalSold: number; revenue: number }[]> {
    const allOrders = await db.getAllOrders();
    const productStats: Record<string, { name: string; totalSold: number; revenue: number }> = {};

    for (const order of allOrders) {
      if (order.status === OrderStatus.CANCELLED) continue;

      for (const item of order.items) {
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            name: item.name,
            totalSold: 0,
            revenue: 0,
          };
        }
        productStats[item.productId].totalSold += item.quantity;
        const price = item.promotionalPrice || item.price;
        productStats[item.productId].revenue += price * item.quantity;
      }
    }

    return Object.entries(productStats)
      .map(([productId, stats]) => ({
        productId,
        name: stats.name,
        totalSold: stats.totalSold,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, limit);
  }

  // Profit/Loss Report
  async getProfitReport(startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
    totalOrders: number;
    averageOrderValue: number;
    salesByPaymentMethod: Record<string, number>;
    dailyBreakdown: { date: string; revenue: number; cost: number; profit: number; orders: number }[];
  }> {
    const allOrders = await db.getAllOrders();
    const allProducts = await db.getAllProducts();
    
    const productCostMap = new Map(allProducts.map(p => [p.id, p.costPrice || p.price * 0.5]));

    let filteredOrders = allOrders.filter(o => o.status !== OrderStatus.CANCELLED);
    
    if (startDate) {
      filteredOrders = filteredOrders.filter(o => new Date(o.createdAt) >= startDate);
    }
    if (endDate) {
      filteredOrders = filteredOrders.filter(o => new Date(o.createdAt) <= endDate);
    }

    let totalRevenue = 0;
    let totalCost = 0;
    const salesByPaymentMethod: Record<string, number> = {};
    const dailyMap = new Map<string, { revenue: number; cost: number; profit: number; orders: number }>();

    for (const order of filteredOrders) {
      totalRevenue += order.total;
      
      // Calculate cost
      let orderCost = 0;
      for (const item of order.items) {
        const costPrice = productCostMap.get(item.productId) || item.price * 0.5;
        orderCost += costPrice * item.quantity;
      }
      totalCost += orderCost;

      // Payment method stats
      const paymentMethod = order.paymentMethod || 'OTHER';
      salesByPaymentMethod[paymentMethod] = (salesByPaymentMethod[paymentMethod] || 0) + order.total;

      // Daily breakdown
      const date = order.createdAt.split('T')[0];
      const dayStats = dailyMap.get(date) || { revenue: 0, cost: 0, profit: 0, orders: 0 };
      dayStats.revenue += order.total;
      dayStats.cost += orderCost;
      dayStats.profit += order.total - orderCost;
      dayStats.orders += 1;
      dailyMap.set(date, dayStats);
    }

    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      profitMargin,
      totalOrders: filteredOrders.length,
      averageOrderValue: filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0,
      salesByPaymentMethod,
      dailyBreakdown,
    };
  }
}

export const orderService = new OrderService();
