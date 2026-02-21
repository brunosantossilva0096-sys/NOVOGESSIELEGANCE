import React, { useState } from 'react';
import { orderService } from '../services';
import { PaymentMethod } from '../types';
import type { CartItem, User } from '../types';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Package, CheckCircle, Loader2 } from 'lucide-react';
import { theme } from '../theme';

interface CartProps {
  items: CartItem[];
  user: User | null;
  onUpdateQuantity: (productId: string, quantity: number, size?: string, colorName?: string) => void;
  onRemove: (productId: string, size?: string, colorName?: string) => void;
  onCheckout: (shippingCost?: number) => void;
  onContinueShopping: () => void;
  onClearCart: () => void;
}

export const Cart: React.FC<CartProps> = ({
  items,
  user,
  onUpdateQuantity,
  onRemove,
  onCheckout,
  onContinueShopping,
  onClearCart,
}) => {
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingInput, setShippingInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [showAsaasMessage, setShowAsaasMessage] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = items.reduce((sum, item) => {
    const price = item.promotionalPrice || item.price;
    return sum + price * item.quantity;
  }, 0);

  const asaasModal = showAsaasMessage && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold mb-4" style={{ color: theme.colors.neutral[800] }}>
            Agradecemos sua Compra!
          </h3>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Você foi redirecionado para a plataforma de pagamento <strong>Asaas</strong>. <br /><br />
            Para agilizarmos o processamento do seu pedido, solicitamos a gentileza de <strong>enviar o comprovante de pagamento</strong> para nosso WhatsApp assim que concluir a transação.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => window.open('https://wa.me/5598985381823?text=Olá! Acabei de realizar o pagamento do meu pedido pelo Asaas e aqui está meu comprovante.', '_blank')}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
            >
              Enviar Comprovante (WhatsApp)
            </button>
            <button
              onClick={() => {
                setShowAsaasMessage(false);
                onContinueShopping();
              }}
              className="w-full py-3 rounded-xl font-bold transition-all"
              style={{ backgroundColor: theme.colors.neutral[100], color: theme.colors.neutral[700] }}
            >
              Voltar para o Site
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const total = subtotal + shippingCost;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleShippingInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const numericValue = parseFloat(value) / 100;
    setShippingInput(value);
    setShippingCost(numericValue);
  };

  const formatShippingInput = (value: string) => {
    const numericValue = parseFloat(value) / 100;
    if (isNaN(numericValue)) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(numericValue);
  };

  const handleProceedToPayment = () => {
    if (!user) {
      onCheckout(); // Redireciona para o login via App.tsx
      return;
    }
    setShowShippingModal(true);
  };

  const handleConfirmShipping = () => {
    setShowShippingModal(false);
    // Passar o valor do frete para o checkout
    onCheckout(shippingCost);
  };

  const handleDirectPayment = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. Criar o pedido no Supabase primeiro
      const orderResult = await orderService.createOrder({
        userId: user!.id,
        userName: user!.name,
        userEmail: user!.email,
        userPhone: user!.phone || '',
        items,
        subtotal,
        shippingCost,
        discount: 0,
        total,
        paymentMethod: PaymentMethod.PIX, // Link fixo é para PIX/Cartão mas tratamos como PIX inicial
        shippingMethod: {
          id: 'site-escolha',
          name: 'Combinado via Site',
          type: 'other',
          cost: shippingCost,
          estimatedDays: 'A combinar',
          isActive: true
        },
        shippingAddress: {
          id: 'site-address',
          name: user?.name || 'Endereço Site',
          street: 'A combinar',
          number: '-',
          neighborhood: '-',
          city: '-',
          state: '-',
          zip: '00000-000',
          isDefault: true
        },
        notes: `Pedido via Site - Pagamento via Link Asaas`
      });

      if (orderResult.success) {
        // 2. Abrir o link de pagamento
        const paymentLink = 'https://www.asaas.com/c/siak23mklgcai3yb';
        window.open(paymentLink, '_blank');

        // 3. Mostrar mensagem e limpar carrinho
        setShowAsaasMessage(true);
        onClearCart();
      } else {
        alert('Erro ao processar pedido: ' + orderResult.error);
      }
    } catch (error) {
      console.error('Error creating site order:', error);
      alert('Erro inesperado ao criar pedido');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0 && !showAsaasMessage) {
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
        {asaasModal}
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
                <span style={{ color: theme.colors.success }}>
                  {shippingCost > 0 ? formatCurrency(shippingCost) : 'A combinar'}
                </span>
              </div>
            </div>

            <div className="pt-4 mb-6" style={{ borderTop: `1px solid ${theme.colors.primary[200]}` }}>
              <div className="flex justify-between text-xl font-bold">
                <span style={{ color: theme.colors.neutral[800] }}>Total</span>
                <span style={{ color: theme.colors.primary[600] }}>{formatCurrency(total)}</span>
              </div>
              <p className="text-sm mt-1" style={{ color: theme.colors.neutral[500] }}>
                ou até 3x de {formatCurrency(total / 3)}
              </p>
            </div>

            <button
              onClick={handleProceedToPayment}
              className="w-full text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              style={{
                background: user
                  ? `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`
                  : `linear-gradient(135deg, ${theme.colors.neutral[500]} 0%, ${theme.colors.neutral[600]} 100%)`,
                boxShadow: user ? theme.shadows.pink : 'none'
              }}
              onMouseEnter={(e) => {
                if (user) {
                  e.currentTarget.style.boxShadow = theme.shadows.pinkLg;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (user) {
                  e.currentTarget.style.boxShadow = theme.shadows.pink;
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {user ? 'Prosseguir com Compra' : 'Entrar para Comprar'} <ArrowRight className="w-5 h-5" />
            </button>

            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm" style={{ color: theme.colors.neutral[500] }}>
                <Package className="w-4 h-4" style={{ color: theme.colors.primary[500] }} />
                <span>Entrega digital imediata</span>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-xs text-yellow-700 mb-2">
                  💡 Precisa combinar o frete? Fale conosco pelo WhatsApp!
                </p>
                <button
                  onClick={() => window.open('https://wa.me/5598985381823?text=Olá! Gostaria de combinar o valor do frete para meu pedido.', '_blank')}
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  WhatsApp: (98) 98538-1823
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para inserir valor do frete */}
      {showShippingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: theme.shadows.pinkLg }}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: theme.colors.neutral[800] }}>
              FINALIZAÇÃO DE COMPRA
            </h3>

            <p className="mb-4" style={{ color: theme.colors.neutral[600] }}>
              Informe o valor do frete combinado com o vendedor:
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.neutral[700] }}>
                Valor do Frete
              </label>
              <input
                type="text"
                value={formatShippingInput(shippingInput)}
                onChange={handleShippingInputChange}
                placeholder="R$ 0,00"
                className="w-full px-4 py-3 rounded-lg border text-lg font-medium focus:outline-none focus:ring-2"
                style={{
                  borderColor: theme.colors.primary[200],
                  color: theme.colors.neutral[800]
                }}
              />
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold mb-2 text-yellow-800">📞 Combinar Frete</h4>
              <p className="text-sm text-yellow-700 mb-3">
                Antes de prosseguir, entre em contato para combinar o valor do frete:
              </p>
              <button
                onClick={() => window.open('https://wa.me/5598985381823?text=Olá! Gostaria de combinar o valor do frete para meu pedido.', '_blank')}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp: (98) 98538-1823
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex justify-between mb-2">
                <span style={{ color: theme.colors.neutral[600] }}>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: theme.colors.neutral[600] }}>Frete:</span>
                <span>{formatCurrency(shippingCost)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span style={{ color: theme.colors.neutral[800] }}>Total:</span>
                <span style={{ color: theme.colors.primary[600] }}>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold mb-3" style={{ color: theme.colors.neutral[800] }}>Forma de Pagamento</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50" style={{ borderColor: theme.colors.primary[200] }}>
                  <input
                    type="radio"
                    name="payment"
                    value="pix"
                    checked={paymentMethod === 'pix'}
                    onChange={() => setPaymentMethod('pix')}
                    className="w-4 h-4"
                  />
                  <span>PIX/Boleto</span>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50" style={{ borderColor: theme.colors.primary[200] }}>
                  <input
                    type="radio"
                    name="payment"
                    value="debit"
                    checked={paymentMethod === 'debit'}
                    onChange={() => setPaymentMethod('debit')}
                    className="w-4 h-4"
                  />
                  <span>Cartão de Débito</span>
                </label>
                <div>
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 mb-2" style={{ borderColor: theme.colors.primary[200] }}>
                    <input
                      type="radio"
                      name="payment"
                      value="credit"
                      checked={paymentMethod === 'credit'}
                      onChange={() => setPaymentMethod('credit')}
                      className="w-4 h-4"
                    />
                    <span>Cartão de Crédito (até 3x)</span>
                  </label>
                  {paymentMethod === 'credit' && (
                    <div className="ml-7 grid grid-cols-1 gap-2 animate-in slide-in-from-top-2 duration-300">
                      {[1, 2, 3].map(n => (
                        <div key={n} className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 shadow-sm text-sm">
                          <span className="text-gray-500 font-medium">{n}x de</span>
                          <span className="font-bold text-green-600">{formatCurrency(total / n)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowShippingModal(false)}
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: theme.colors.neutral[100],
                  color: theme.colors.neutral[700]
                }}
              >
                Cancelar
              </button>
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600 mb-3 text-center">
                💳 Após escolher a forma de pagamento, clique abaixo para acessar o Asaas:
              </p>
              <button
                onClick={handleDirectPayment}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                )}
                {isProcessing ? 'Processando...' : 'Pagar com Asaas'}
              </button>
            </div>
          </div>
        </div>
      )}
      {asaasModal}
    </div>
  );
};
