import React, { useState } from 'react';
import type { User, CartItem, Order, StoreConfig } from '../types';
import { PaymentMethod, PaymentStatus } from '../types';
import { orderService, emailService, pdfService, whatsappService } from '../services';
import { CreditCard, QrCode, ShieldCheck, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

interface CheckoutProps {
  user: User;
  cart: CartItem[];
  storeConfig: StoreConfig | null;
  shippingCost: number;
  onSuccess: (order: Order) => void;
  onBack: () => void;
}

export const Checkout: React.FC<CheckoutProps> = ({
  user,
  cart,
  storeConfig,
  shippingCost,
  onSuccess,
  onBack,
}) => {
  const [step, setStep] = useState<'payment' | 'confirmation'>('payment');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PIX);
  const [isProcessing, setIsProcessing] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [qrCode, setQrCode] = useState<string | undefined>();

  const subtotal = cart.reduce((sum, item) => {
    const price = item.promotionalPrice || item.price;
    return sum + price * item.quantity;
  }, 0);

  const total = subtotal + shippingCost;

  const handleCompleteOrder = async () => {
    setIsProcessing(true);

    try {
      // Redirecionar diretamente para o link de pagamento Asaas
      const paymentLink = 'https://www.asaas.com/c/siak23mklgcai3yb';
      
      // Criar pedido local para registro
      const orderResult = await orderService.createOrder({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        items: cart,
        subtotal,
        shippingCost: shippingCost,
        discount: 0,
        total,
        paymentMethod,
        shippingMethod: {
          id: 'free-shipping',
          name: 'A combinar com vendedor',
          type: 'retirada',
          cost: shippingCost,
          estimatedDays: 'Imediato',
          isActive: true,
        },
        shippingAddress: {
          id: 'default-address',
          name: user.name,
          street: 'Entrega Digital',
          number: '-',
          neighborhood: '-',
          city: '-',
          state: '-',
          zip: '00000-000',
          isDefault: false,
        },
      });

      if (orderResult.success && orderResult.order) {
        // Abrir link de pagamento em nova aba
        window.open(paymentLink, '_blank');
        
        setOrder(orderResult.order);
        setStep('confirmation');

        // Enviar confirmação por email
        emailService.sendOrderConfirmation({
          orderNumber: orderResult.order.orderNumber,
          customerName: user.name,
          customerEmail: user.email,
          orderTotal: total,
          orderItems: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.promotionalPrice || i.price })),
          orderStatus: 'Aguardando Pagamento',
          paymentMethod: paymentMethod === PaymentMethod.PIX ? 'PIX' : paymentMethod === PaymentMethod.CREDIT_CARD ? 'Cartão de Crédito' : 'Cartão de Débito',
        });

        // Notificação WhatsApp
        whatsappService.sendOrderNotification(orderResult.order, false);

        // Notificação WhatsApp para cliente
        if (user.phone) {
          whatsappService.sendCustomerNotification(orderResult.order, user.phone);
        }
      } else {
        alert('Erro ao criar pedido. Tente novamente.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Erro ao processar checkout. Tente novamente.');
    }

    setIsProcessing(false);
  };

  const handlePrintReceipt = () => {
    if (order) {
      pdfService.openReceipt({
        order,
        storeName: storeConfig?.name || 'GessiElegance',
        storeEmail: storeConfig?.contactEmail,
        storePhone: storeConfig?.contactPhone,
      });
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (step === 'confirmation') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pedido Confirmado!</h2>
          <p className="text-gray-600">Seu pedido foi recebido e está sendo processado.</p>
        </div>

        {order && (
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h3 className="font-semibold mb-4">Resumo do Pedido</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Número do Pedido:</span>
                <span className="font-medium">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-medium">{formatCurrency(order.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Método de Pagamento:</span>
                <span className="font-medium">
                  {paymentMethod === PaymentMethod.PIX ? 'PIX' : 
                   paymentMethod === PaymentMethod.CREDIT_CARD ? 'Cartão de Crédito' : 
                   'Cartão de Débito'}
                </span>
              </div>
            </div>
          </div>
        )}

        {qrCode && paymentMethod === PaymentMethod.PIX && (
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <h3 className="font-semibold mb-4">Pague via PIX</h3>
            <div className="bg-white p-4 rounded border">
              <img src={qrCode} alt="QR Code PIX" className="w-48 h-48 mx-auto mb-4" />
              <p className="text-sm text-gray-600 text-center">
                Escaneie o QR Code acima com o aplicativo do seu banco para pagar
              </p>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-2">Link de Pagamento</h3>
          <p className="text-sm text-gray-600 mb-3">
            Clique no botão abaixo para acessar diretamente a página de pagamento Asaas:
          </p>
          <button
            onClick={() => window.open('https://www.asaas.com/c/siak23mklgcai3yb', '_blank')}
            className="w-full bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition-colors font-medium"
          >
            Acessar Página de Pagamento
          </button>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handlePrintReceipt}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Imprimir Comprovante
          </button>
          <button
            onClick={() => onSuccess(order!)}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Continuar Comprando
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
        <h2 className="text-2xl font-bold">Prosseguir com Compra</h2>
        <div className="w-20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div>
          <h3 className="font-semibold mb-4">Resumo do Pedido</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            {cart.map((item, index) => (
              <div key={index} className="flex justify-between items-center mb-3 pb-3 border-b last:border-b-0">
                <div className="flex-1">
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-gray-600">
                    {item.quantity}x {formatCurrency(item.promotionalPrice || item.price)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {formatCurrency((item.promotionalPrice || item.price) * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Frete:</span>
                <span className="text-green-600">
                  {shippingCost > 0 ? formatCurrency(shippingCost) : 'A combinar'}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <p className="text-sm mt-1">
                ou até 3x de {formatCurrency(total / 3)}
              </p>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div>
          <h3 className="font-semibold mb-4">Método de Pagamento</h3>
          <div className="space-y-3">
            <button
              onClick={() => setPaymentMethod(PaymentMethod.PIX)}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                paymentMethod === PaymentMethod.PIX
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <QrCode className="w-6 h-6" />
                <div className="text-left">
                  <p className="font-medium">PIX</p>
                  <p className="text-sm text-gray-600">Pagamento instantâneo</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod(PaymentMethod.CREDIT_CARD)}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                paymentMethod === PaymentMethod.CREDIT_CARD
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6" />
                <div className="text-left">
                  <p className="font-medium">Cartão de Crédito</p>
                  <p className="text-sm text-gray-600">Parcele em até 3x</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod(PaymentMethod.DEBIT_CARD)}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                paymentMethod === PaymentMethod.DEBIT_CARD
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6" />
                <div className="text-left">
                  <p className="font-medium">Cartão de Débito</p>
                  <p className="text-sm text-gray-600">Débito na hora</p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">Pagamento Seguro</span>
            </div>
            <p className="text-sm text-blue-800">
              Seus dados são criptografados e protegidos. Aceitamos as principais bandeiras.
            </p>
          </div>

          <button
            onClick={handleCompleteOrder}
            disabled={isProcessing}
            className="w-full mt-6 bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Processando...
              </div>
            ) : (
              'Prosseguir com Pedido'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
