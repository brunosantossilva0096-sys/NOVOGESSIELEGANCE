import React, { useState } from 'react';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Package, Truck, MapPin } from 'lucide-react';
import type { CartItem, ShippingQuote } from '../types';
import { theme } from '../theme';
import { shippingService } from '../services';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number, size?: string, colorName?: string) => void;
  onRemove: (productId: string, size?: string, colorName?: string) => void;
  onCheckout: () => void;
  onContinueShopping: () => void;
}

export const Cart: React.FC<CartProps> = ({
  items,
  onUpdateQuantity,
  onRemove,
  onCheckout,
  onContinueShopping,
}) => {
  const [cep, setCep] = useState('');
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuote[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingQuote | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const subtotal = items.reduce((sum, item) => {
    const price = item.promotionalPrice || item.price;
    return sum + price * item.quantity;
  }, 0);

  const total = subtotal + (selectedShipping?.cost || 0);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatCep = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    if (formatted.length <= 9) {
      setCep(formatted);
      setShippingError(null);
    }
  };

  const calculateShipping = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setShippingError('CEP inválido');
      return;
    }

    setIsCalculating(true);
    setShippingError(null);

    try {
      const result = await shippingService.calculateShipping(cleanCep, subtotal);
      if (result.success && result.quotes.length > 0) {
        setShippingQuotes(result.quotes);
        setSelectedShipping(result.quotes[0]);
      } else {
        setShippingError(result.error || 'Não foi possível calcular o frete');
        setShippingQuotes([]);
        setSelectedShipping(null);
      }
    } catch (error) {
      setShippingError('Erro ao calcular frete');
      setShippingQuotes([]);
      setSelectedShipping(null);
    } finally {
      setIsCalculating(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div 
          className="text-center py-20 rounded-3xl border-2 border-dashed"
          style={{ backgroundColor: 'white', borderColor: theme.colors.primary[200] }}
        >
          <ShoppingBag className="w-16 h-16 mx-auto mb-6" style={{ color: theme.colors.primary[300] }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: theme.colors.neutral[800] }}>Seu carrinho está vazio</h2>
          <p className="mb-8" style={{ color: theme.colors.neutral[500] }}>Parece que você ainda não adicionou nenhum item.</p>
          <button
            onClick={onContinueShopping}
            className="text-white px-8 py-3 rounded-full font-bold transition-all hover:scale-105"
            style={{ 
              background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
              boxShadow: theme.shadows.pink
            }}
          >
            Explorar Loja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-3" style={{ color: theme.colors.neutral[800] }}>
        <ShoppingBag className="w-8 h-8" style={{ color: theme.colors.primary[500] }} />
        Seu Carrinho ({items.length} {items.length === 1 ? 'item' : 'itens'})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.size}-${item.color?.name}`}
              className="p-4 rounded-2xl flex gap-4"
              style={{ 
                backgroundColor: 'white',
                boxShadow: theme.shadows.sm,
                border: `1px solid ${theme.colors.primary[100]}`
              }}
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
              />

              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate" style={{ color: theme.colors.neutral[800] }}>{item.name}</h3>

                {(item.size || item.color) && (
                  <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: theme.colors.neutral[500] }}>
                    {item.size && <span>Tamanho: {item.size}</span>}
                    {item.color && (
                      <span className="flex items-center gap-1">
                        Cor: {item.color.name}
                        <span
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: item.color.hex, borderColor: theme.colors.primary[200] }}
                        />
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center rounded-lg p-1" style={{ backgroundColor: theme.colors.primary[50] }}>
                    <button
                      onClick={() => onUpdateQuantity(item.productId, item.quantity - 1, item.size, item.color?.name)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: theme.colors.neutral[600] }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.primary[200];
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 font-semibold text-sm min-w-[3rem] text-center" style={{ color: theme.colors.neutral[800] }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.productId, item.quantity + 1, item.size, item.color?.name)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: theme.colors.neutral[600] }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.primary[200];
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-right">
                    {item.promotionalPrice && item.promotionalPrice < item.price ? (
                      <>
                        <p className="text-sm line-through" style={{ color: theme.colors.neutral[400] }}>
                          {formatCurrency(item.price)}
                        </p>
                        <p className="font-bold" style={{ color: theme.colors.primary[600] }}>
                          {formatCurrency(item.promotionalPrice)}
                        </p>
                      </>
                    ) : (
                      <p className="font-bold" style={{ color: theme.colors.neutral[800] }}>
                        {formatCurrency(item.price)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onRemove(item.productId, item.size, item.color?.name)}
                className="p-2 self-start transition-colors"
                style={{ color: theme.colors.neutral[300] }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = theme.colors.error;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = theme.colors.neutral[300];
                }}
                title="Remover item"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}

          <button
            onClick={onContinueShopping}
            className="flex items-center gap-2 py-2 font-medium transition-all hover:gap-3"
            style={{ color: theme.colors.primary[600] }}
          >
            ← Continuar comprando
          </button>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div 
            className="p-6 rounded-2xl sticky top-4"
            style={{ 
              backgroundColor: 'white',
              boxShadow: theme.shadows.md,
              border: `1px solid ${theme.colors.primary[100]}`
            }}
          >
            <h2 className="font-bold text-lg mb-4" style={{ color: theme.colors.neutral[800] }}>Resumo do Pedido</h2>

            {/* CEP Input */}
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: theme.colors.neutral[700] }}>
                <Truck className="w-4 h-4" style={{ color: theme.colors.primary[500] }} />
                Calcular frete
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: theme.colors.neutral[400] }} />
                  <input
                    type="text"
                    value={cep}
                    onChange={handleCepChange}
                    placeholder="00000-000"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    style={{ 
                      borderColor: shippingError ? theme.colors.error : theme.colors.primary[200],
                      color: theme.colors.neutral[800]
                    }}
                  />
                </div>
                <button
                  onClick={calculateShipping}
                  disabled={isCalculating || cep.length < 8}
                  className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap"
                  style={{ 
                    backgroundColor: isCalculating || cep.length < 8 ? theme.colors.neutral[200] : theme.colors.primary[500],
                    color: isCalculating || cep.length < 8 ? theme.colors.neutral[500] : 'white'
                  }}
                >
                  {isCalculating ? '...' : 'Calcular'}
                </button>
              </div>
              {shippingError && (
                <p className="text-xs mt-1" style={{ color: theme.colors.error }}>{shippingError}</p>
              )}
            </div>

            {/* Shipping Options */}
            {shippingQuotes.length > 0 && (
              <div className="mb-4 space-y-2">
                {shippingQuotes.map((quote) => (
                  <label
                    key={quote.method.id}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all"
                    style={{ 
                      borderColor: selectedShipping?.method.id === quote.method.id ? theme.colors.primary[400] : theme.colors.primary[100],
                      backgroundColor: selectedShipping?.method.id === quote.method.id ? theme.colors.primary[50] : 'transparent'
                    }}
                  >
                    <input
                      type="radio"
                      name="shipping"
                      checked={selectedShipping?.method.id === quote.method.id}
                      onChange={() => setSelectedShipping(quote)}
                      className="accent-pink-500"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm" style={{ color: theme.colors.neutral[800] }}>
                          {quote.method.name}
                        </span>
                        <span className="font-bold text-sm" style={{ color: theme.colors.primary[600] }}>
                          {quote.cost === 0 ? 'Grátis' : formatCurrency(quote.cost)}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: theme.colors.neutral[500] }}>
                        {quote.estimatedDays}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="space-y-3 mb-6">
              <div className="flex justify-between" style={{ color: theme.colors.neutral[600] }}>
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between" style={{ color: theme.colors.neutral[600] }}>
                <span>Frete</span>
                <span style={{ color: selectedShipping ? theme.colors.success : theme.colors.neutral[400] }}>
                  {selectedShipping ? (selectedShipping.cost === 0 ? 'Grátis' : formatCurrency(selectedShipping.cost)) : 'A calcular'}
                </span>
              </div>
            </div>

            <div className="pt-4 mb-6" style={{ borderTop: `1px solid ${theme.colors.primary[200]}` }}>
              <div className="flex justify-between text-xl font-bold">
                <span style={{ color: theme.colors.neutral[800] }}>Total</span>
                <span style={{ color: theme.colors.primary[600] }}>{formatCurrency(total)}</span>
              </div>
              <p className="text-sm mt-1" style={{ color: theme.colors.neutral[500] }}>
                ou até 6x de {formatCurrency(total / 6)}
              </p>
            </div>

            <button
              onClick={onCheckout}
              className="w-full text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              style={{ 
                background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
                boxShadow: theme.shadows.pink
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = theme.shadows.pinkLg;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = theme.shadows.pink;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Finalizar Compra <ArrowRight className="w-5 h-5" />
            </button>

            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm" style={{ color: theme.colors.neutral[500] }}>
                <Package className="w-4 h-4" style={{ color: theme.colors.primary[500] }} />
                <span>Entrega em todo o Brasil</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
