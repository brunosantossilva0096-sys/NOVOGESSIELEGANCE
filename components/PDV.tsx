import React, { useState, useEffect } from 'react';
import { db, orderService, auth, pdfService } from '../services';
import type { Product, CartItem, Order, User } from '../types';
import { OrderStatus, PaymentStatus, PaymentMethod } from '../types';
import {
  ShoppingCart, Plus, Minus, Trash2, Calculator, Banknote,
  CreditCard, QrCode, X, Check, Search, Package, User as UserIcon,
  ArrowRight, Receipt, Printer
} from 'lucide-react';
import { theme } from '../theme';

interface PDVProps {
  onClose: () => void;
  currentUser: User | null;
}

export const PDV: React.FC<PDVProps> = ({ onClose, currentUser }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('PDV: Loading products...');
      const prods = await db.getActiveProducts();
      console.log('PDV: Products loaded:', prods.length);
      setProducts(prods);
      const cats = [...new Set(prods.map(p => p.category))];
      setCategories(cats);
    } catch (err) {
      console.error('PDV: Error loading products:', err);
      setError('Erro ao carregar produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory && p.stock > 0;
  });

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        alert('Estoque insuficiente');
        return;
      }
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        price: product.price,
        promotionalPrice: product.promotionalPrice,
        image: product.images[0] || '',
        quantity: 1
      }]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.productId !== productId));
    } else {
      const product = products.find(p => p.id === productId);
      if (product && quantity > product.stock) {
        alert('Estoque insuficiente');
        return;
      }
      setCart(cart.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCustomerName('');
    setCustomerPhone('');
  };

  const subtotal = cart.reduce((sum, item) => {
    const price = item.promotionalPrice || item.price;
    return sum + price * item.quantity;
  }, 0);

  const total = Math.max(0, subtotal - discount);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('Adicione produtos ao carrinho');
      return;
    }

    setIsProcessing(true);

    try {
      const orderResult = await orderService.createOrder({
        userId: currentUser?.id || '', // Empty string or null if allowed
        userName: customerName || 'Cliente PDV',
        userEmail: currentUser?.email || 'gessianebelo1234@gmail.com',
        userPhone: customerPhone,
        items: cart,
        subtotal,
        shippingCost: 0,
        discount,
        total,
        paymentMethod,
        shippingMethod: {
          id: 'pdv',
          name: 'Retirada/Presencial',
          type: 'retirada',
          cost: 0,
          estimatedDays: 'Imediato',
          isActive: true
        },
        shippingAddress: {
          id: 'pdv-address',
          name: 'Loja',
          street: 'Retirada em loja',
          number: 'PDV',
          neighborhood: '-',
          city: '-',
          state: '-',
          zip: '00000-000',
          isDefault: true
        },
        notes: `Venda PDV - Atendente: ${currentUser?.name || 'Sistema'} `
      });

      if (orderResult.success && orderResult.order) {
        if (paymentMethod === PaymentMethod.CASH || paymentMethod === PaymentMethod.CREDIT_CARD || paymentMethod === PaymentMethod.DEBIT_CARD || paymentMethod === PaymentMethod.PIX) {
          await orderService.updatePaymentStatus(
            orderResult.order.id,
            PaymentStatus.RECEIVED
          );
          await orderService.updateOrderStatus(orderResult.order.id, OrderStatus.PAID);

          // Update the object for the receipt
          orderResult.order.status = OrderStatus.PAID;
          orderResult.order.paymentStatus = PaymentStatus.RECEIVED;
        }

        setLastOrder(orderResult.order);
        setShowReceipt(true);
        clearCart();
      } else {
        alert('Erro ao criar venda: ' + (orderResult.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('PDV sale error:', error);
      alert('Erro ao processar venda');
    } finally {
      setIsProcessing(false);
    }
  };

  const printReceipt = () => {
    if (lastOrder) {
      pdfService.openReceipt({
        order: lastOrder,
        storeName: 'Novage Gessi Elegance',
        storePhone: '(98) 98538-1823',
        storeEmail: 'gessianebelo1234@gmail.com'
      });
    }
  };

  if (showReceipt && lastOrder) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
          style={{ boxShadow: theme.shadows.xl }}
        >
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: theme.colors.success + '20' }}
            >
              <Check className="w-8 h-8" style={{ color: theme.colors.success }} />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: theme.colors.neutral[800] }}>
              Venda Concluída!
            </h2>
            <p style={{ color: theme.colors.neutral[500] }}>
              Pedido #{lastOrder.orderNumber}
            </p>
          </div>

          <div className="border-t border-b py-4 mb-4" style={{ borderColor: theme.colors.primary[100] }}>
            <div className="flex justify-between mb-2">
              <span style={{ color: theme.colors.neutral[600] }}>Subtotal:</span>
              <span style={{ color: theme.colors.neutral[800] }}>{formatCurrency(lastOrder.subtotal)}</span>
            </div>
            {lastOrder.discount > 0 && (
              <div className="flex justify-between mb-2">
                <span style={{ color: theme.colors.neutral[600] }}>Desconto:</span>
                <span style={{ color: theme.colors.success }}>-{formatCurrency(lastOrder.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold">
              <span style={{ color: theme.colors.neutral[800] }}>Total:</span>
              <span style={{ color: theme.colors.primary[600] }}>{formatCurrency(lastOrder.total)}</span>
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span style={{ color: theme.colors.neutral[500] }}>Pagamento:</span>
              <span style={{ color: theme.colors.neutral[700] }}>
                {paymentMethod === PaymentMethod.CASH ? 'Dinheiro' :
                  paymentMethod === PaymentMethod.CREDIT_CARD ? 'Cartão de Crédito' :
                    paymentMethod === PaymentMethod.DEBIT_CARD ? 'Cartão de Débito' :
                      paymentMethod === PaymentMethod.PIX ? 'PIX' : 'Boleto'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={printReceipt}
              className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              style={{
                backgroundColor: theme.colors.primary[100],
                color: theme.colors.primary[700]
              }}
            >
              <Printer className="w-5 h-5" />
              Imprimir Recibo
            </button>
            <button
              onClick={() => {
                setShowReceipt(false);
                onClose();
              }}
              className="w-full py-3 rounded-xl font-semibold text-white"
              style={{
                background: `linear - gradient(135deg, ${theme.colors.primary[500]} 0 %, ${theme.colors.primary[600]} 100 %)`
              }}
            >
              Nova Venda
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex z-50">
      {/* Left Panel - Products */}
      <div className="flex-1 bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: theme.colors.primary[100] }}
            >
              <Calculator className="w-5 h-5" style={{ color: theme.colors.primary[600] }} />
            </div>
            <div>
              <h1 className="font-bold text-lg" style={{ color: theme.colors.neutral[800] }}>PDV - Ponto de Venda</h1>
              <p className="text-sm" style={{ color: theme.colors.neutral[500] }}>Vendas presenciais rápidas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: theme.colors.neutral[400] }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="p-4 bg-white border-b">
          <div className="flex gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: theme.colors.neutral[400] }} />
              <input
                type="text"
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                style={{
                  borderColor: theme.colors.primary[200],
                  color: theme.colors.neutral[800]
                }}
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                backgroundColor: selectedCategory === 'all' ? theme.colors.primary[500] : theme.colors.primary[50],
                color: selectedCategory === 'all' ? 'white' : theme.colors.primary[600]
              }}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                style={{
                  backgroundColor: selectedCategory === cat ? theme.colors.primary[500] : theme.colors.primary[50],
                  color: selectedCategory === cat ? 'white' : theme.colors.primary[600]
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white rounded-xl p-3 text-left transition-all hover:shadow-md"
                style={{ border: `1px solid ${theme.colors.primary[100]} ` }}
              >
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full aspect-square object-cover rounded-lg mb-2"
                />
                <h3 className="font-medium text-sm line-clamp-2" style={{ color: theme.colors.neutral[800] }}>
                  {product.name}
                </h3>
                <p className="font-bold mt-1" style={{ color: theme.colors.primary[600] }}>
                  {formatCurrency(product.promotionalPrice || product.price)}
                </p>
                <p className="text-xs" style={{ color: theme.colors.neutral[400] }}>
                  Estoque: {product.stock}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div
        className="w-96 bg-white flex flex-col shadow-xl"
        style={{ borderLeft: `1px solid ${theme.colors.primary[100]} ` }}
      >
        {/* Cart Header */}
        <div className="p-4 border-b" style={{ borderColor: theme.colors.primary[100] }}>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5" style={{ color: theme.colors.primary[500] }} />
            <h2 className="font-bold" style={{ color: theme.colors.neutral[800] }}>Carrinho</h2>
            <span
              className="ml-auto px-2 py-1 rounded-lg text-sm font-medium"
              style={{ backgroundColor: theme.colors.primary[100], color: theme.colors.primary[700] }}
            >
              {cart.reduce((sum, item) => sum + item.quantity, 0)} itens
            </span>
          </div>

          {/* Customer Info */}
          <div className="space-y-2">
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: theme.colors.neutral[400] }} />
              <input
                type="text"
                placeholder="Nome do cliente (opcional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: theme.colors.primary[200], color: theme.colors.neutral[800] }}
              />
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-8" style={{ color: theme.colors.neutral[400] }}>
              <Package className="w-12 h-12 mx-auto mb-2" />
              <p>Carrinho vazio</p>
              <p className="text-sm">Clique em um produto para adicionar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div
                  key={item.productId}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: theme.colors.primary[50] }}
                >
                  <img src={item.image} alt={item.name} className="w-12 h-12 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: theme.colors.neutral[800] }}>
                      {item.name}
                    </p>
                    <p className="text-sm" style={{ color: theme.colors.primary[600] }}>
                      {formatCurrency(item.promotionalPrice || item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="p-1 rounded"
                      style={{ color: theme.colors.neutral[500] }}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-medium" style={{ color: theme.colors.neutral[800] }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="p-1 rounded"
                      style={{ color: theme.colors.neutral[500] }}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    style={{ color: theme.colors.error }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="p-4 border-t" style={{ borderColor: theme.colors.primary[100] }}>
          {/* Discount Input */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm" style={{ color: theme.colors.neutral[600] }}>Desconto:</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.colors.neutral[400] }}>R$</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: theme.colors.primary[200], color: theme.colors.neutral[800] }}
                min={0}
                max={subtotal}
                step={0.01}
              />
            </div>
          </div>

          <div className="flex justify-between text-lg mb-1">
            <span style={{ color: theme.colors.neutral[600] }}>Subtotal:</span>
            <span style={{ color: theme.colors.neutral[800] }}>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between mb-1">
              <span style={{ color: theme.colors.success }}>Desconto:</span>
              <span style={{ color: theme.colors.success }}>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-2xl font-bold mb-4">
            <span style={{ color: theme.colors.neutral[800] }}>Total:</span>
            <span style={{ color: theme.colors.primary[600] }}>{formatCurrency(total)}</span>
          </div>

          {/* Payment Methods */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setPaymentMethod(PaymentMethod.CASH)}
              className="p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all"
              style={{
                borderColor: paymentMethod === PaymentMethod.CASH ? theme.colors.primary[500] : theme.colors.primary[100],
                backgroundColor: paymentMethod === PaymentMethod.CASH ? theme.colors.primary[50] : 'white'
              }}
            >
              <Banknote className="w-6 h-6" style={{ color: paymentMethod === PaymentMethod.CASH ? theme.colors.primary[600] : theme.colors.neutral[400] }} />
              <span className="text-sm font-medium">Dinheiro</span>
            </button>
            <button
              onClick={() => setPaymentMethod(PaymentMethod.CREDIT_CARD)}
              className="p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all"
              style={{
                borderColor: paymentMethod === PaymentMethod.CREDIT_CARD ? theme.colors.primary[500] : theme.colors.primary[100],
                backgroundColor: paymentMethod === PaymentMethod.CREDIT_CARD ? theme.colors.primary[50] : 'white'
              }}
            >
              <CreditCard className="w-6 h-6" style={{ color: paymentMethod === PaymentMethod.CREDIT_CARD ? theme.colors.primary[600] : theme.colors.neutral[400] }} />
              <span className="text-sm font-medium">Crédito</span>
            </button>
            <button
              onClick={() => setPaymentMethod(PaymentMethod.DEBIT_CARD)}
              className="p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all"
              style={{
                borderColor: paymentMethod === PaymentMethod.DEBIT_CARD ? theme.colors.primary[500] : theme.colors.primary[100],
                backgroundColor: paymentMethod === PaymentMethod.DEBIT_CARD ? theme.colors.primary[50] : 'white'
              }}
            >
              <CreditCard className="w-6 h-6" style={{ color: paymentMethod === PaymentMethod.DEBIT_CARD ? theme.colors.primary[600] : theme.colors.neutral[400] }} />
              <span className="text-sm font-medium">Débito</span>
            </button>
            <button
              onClick={() => setPaymentMethod(PaymentMethod.PIX)}
              className="p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all"
              style={{
                borderColor: paymentMethod === PaymentMethod.PIX ? theme.colors.primary[500] : theme.colors.primary[100],
                backgroundColor: paymentMethod === PaymentMethod.PIX ? theme.colors.primary[50] : 'white'
              }}
            >
              <QrCode className="w-6 h-6" style={{ color: paymentMethod === PaymentMethod.PIX ? theme.colors.primary[600] : theme.colors.neutral[400] }} />
              <span className="text-sm font-medium">PIX</span>
            </button>
          </div>

          <button
            onClick={handleCompleteSale}
            disabled={cart.length === 0 || isProcessing}
            className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all"
            style={{
              background: cart.length === 0
                ? theme.colors.neutral[300]
                : `linear - gradient(135deg, ${theme.colors.primary[500]} 0 %, ${theme.colors.primary[600]} 100 %)`,
              boxShadow: cart.length > 0 ? theme.shadows.pink : 'none'
            }}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Receipt className="w-5 h-5" />
                Finalizar Venda
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
