import React from 'react';
import type { CartItem, User } from '../types';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Package } from 'lucide-react';
import { theme } from '../theme';

interface CartProps {
  items: CartItem[];
  user: User | null;
  onUpdateQuantity: (productId: string, quantity: number, size?: string, colorName?: string) => void;
  onRemove: (productId: string, size?: string, colorName?: string) => void;
  onContinueShopping: () => void;
  onClearCart: () => void;
}

export const Cart: React.FC<CartProps> = ({
  items,
  user,
  onUpdateQuantity,
  onRemove,
  onContinueShopping,
  onClearCart,
}) => {
  const subtotal = items.reduce((sum, item) => {
    const price = item.promotionalPrice || item.price;
    return sum + price * item.quantity;
  }, 0);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const removeEmojis = (text: string) => {
    return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  };

  const handleWhatsAppCheckout = () => {
    const phone = '5598985381823'; // Número da Gessi Elegance

    // Formatar os itens do carrinho para a mensagem
    const itemsList = items.map(item => {
      const details = [];
      if (item.size) details.push(`Tamanho: ${item.size}`);
      if (item.color) details.push(`Cor: ${item.color.name}`);
      const detailsStr = details.length > 0 ? ` (${details.join(', ')})` : '';
      const unitPrice = item.promotionalPrice || item.price;
      const cleanName = removeEmojis(item.name);
      return `• ${item.quantity}x ${cleanName}${detailsStr} - ${formatCurrency(unitPrice * item.quantity)}`;
    }).join('\n');

    const message = `Olá! Gostaria de finalizar meu pedido na Gessi Elegance:\n\n${itemsList}\n\nSubtotal: ${formatCurrency(subtotal)}\n\nAguardo seu retorno para combinarmos o frete e o pagamento.`;

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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
    <div className="max-w-5xl mx-auto px-4 py-8">
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

            <div className="space-y-3 mb-6">
              <div className="flex justify-between" style={{ color: theme.colors.neutral[600] }}>
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between" style={{ color: theme.colors.neutral[600] }}>
                <span>Frete</span>
                <span style={{ color: theme.colors.success }}>A combinar</span>
              </div>
            </div>

            <div className="pt-4 mb-6" style={{ borderTop: `1px solid ${theme.colors.primary[200]}` }}>
              <div className="flex justify-between text-xl font-bold">
                <span style={{ color: theme.colors.neutral[800] }}>Total</span>
                <span style={{ color: theme.colors.primary[600] }}>{formatCurrency(subtotal)}</span>
              </div>
              <p className="text-sm mt-1" style={{ color: theme.colors.neutral[500] }}>
                Valor dos itens (Frete não incluso)
              </p>
            </div>

            <button
              onClick={handleWhatsAppCheckout}
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
              Finalizar pelo WhatsApp <ArrowRight className="w-5 h-5" />
            </button>

            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm" style={{ color: theme.colors.neutral[500] }}>
                <Package className="w-4 h-4" style={{ color: theme.colors.primary[500] }} />
                <span>Combinamos frete e pagamento</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
