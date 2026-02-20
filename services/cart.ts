import type { CartItem, ColorOption } from '../types';

const CART_STORAGE_KEY = 'gessielegance_cart';
const CART_EXPIRY_DAYS = 30;

interface CartData {
  items: CartItem[];
  updatedAt: string;
  expiresAt: string;
}

class CartService {
  private items: CartItem[] = [];
  private userId: string | null = null;

  init(userId?: string) {
    this.userId = userId || null;
    this.loadCart();
  }

  private getStorageKey(): string {
    return this.userId ? `${CART_STORAGE_KEY}_${this.userId}` : CART_STORAGE_KEY;
  }

  private loadCart() {
    try {
      const stored = localStorage.getItem(this.getStorageKey());
      if (stored) {
        const data: CartData = JSON.parse(stored);
        // Check if cart is expired
        if (new Date(data.expiresAt) > new Date()) {
          this.items = data.items;
        } else {
          this.clearCart();
        }
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      this.items = [];
    }
  }

  private saveCart() {
    try {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + CART_EXPIRY_DAYS);

      const data: CartData = {
        items: this.items,
        updatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      localStorage.setItem(this.getStorageKey(), JSON.stringify(data));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }

  getItems(): CartItem[] {
    return [...this.items];
  }

  getItemCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getSubtotal(): number {
    return this.items.reduce((sum, item) => {
      const price = item.promotionalPrice || item.price;
      return sum + price * item.quantity;
    }, 0);
  }

  addItem(item: Omit<CartItem, 'quantity'> & { quantity?: number }): void {
    const existingIndex = this.items.findIndex(
      i => i.productId === item.productId &&
           i.size === item.size &&
           i.color?.name === item.color?.name
    );

    if (existingIndex >= 0) {
      this.items[existingIndex].quantity += item.quantity || 1;
    } else {
      this.items.push({
        ...item,
        quantity: item.quantity || 1,
      });
    }

    this.saveCart();
  }

  removeItem(productId: string, size?: string, colorName?: string): void {
    this.items = this.items.filter(
      i => !(i.productId === productId && i.size === size && i.color?.name === colorName)
    );
    this.saveCart();
  }

  updateQuantity(productId: string, quantity: number, size?: string, colorName?: string): void {
    if (quantity <= 0) {
      this.removeItem(productId, size, colorName);
      return;
    }

    const item = this.items.find(
      i => i.productId === productId && i.size === size && i.color?.name === colorName
    );

    if (item) {
      item.quantity = quantity;
      this.saveCart();
    }
  }

  updateItemOptions(
    productId: string,
    oldSize?: string,
    oldColorName?: string,
    newSize?: string,
    newColor?: ColorOption
  ): void {
    const itemIndex = this.items.findIndex(
      i => i.productId === productId && i.size === oldSize && i.color?.name === oldColorName
    );

    if (itemIndex >= 0) {
      // Check if item with new options already exists
      const existingIndex = this.items.findIndex(
        i => i.productId === productId && i.size === newSize && i.color?.name === newColor?.name && i !== this.items[itemIndex]
      );

      if (existingIndex >= 0) {
        // Merge quantities
        this.items[existingIndex].quantity += this.items[itemIndex].quantity;
        this.items.splice(itemIndex, 1);
      } else {
        this.items[itemIndex].size = newSize;
        this.items[itemIndex].color = newColor;
      }
      this.saveCart();
    }
  }

  clearCart(): void {
    this.items = [];
    localStorage.removeItem(this.getStorageKey());
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  // Merge guest cart with user cart after login
  mergeCarts(userId: string): void {
    const guestCartKey = CART_STORAGE_KEY;
    const stored = localStorage.getItem(guestCartKey);

    if (stored) {
      try {
        const guestData: CartData = JSON.parse(stored);
        const currentItems = [...this.items];

        // Switch to user cart
        this.userId = userId;
        this.loadCart();

        // Add guest items to user cart
        for (const guestItem of guestData.items) {
          const existingIndex = this.items.findIndex(
            i => i.productId === guestItem.productId &&
                 i.size === guestItem.size &&
                 i.color?.name === guestItem.color?.name
          );

          if (existingIndex >= 0) {
            this.items[existingIndex].quantity += guestItem.quantity;
          } else {
            this.items.push(guestItem);
          }
        }

        this.saveCart();

        // Clear guest cart
        localStorage.removeItem(guestCartKey);
      } catch (error) {
        console.error('Error merging carts:', error);
      }
    }
  }

  // Calculate totals with shipping and discount
  calculateTotals(shippingCost: number = 0, discount: number = 0): {
    subtotal: number;
    shipping: number;
    discount: number;
    total: number;
  } {
    const subtotal = this.getSubtotal();
    const total = Math.max(0, subtotal + shippingCost - discount);

    return {
      subtotal,
      shipping: shippingCost,
      discount,
      total,
    };
  }
}

export const cartService = new CartService();
