import React, { useState } from 'react';
import type { User, CartItem, Order, StoreConfig, Address } from '../types';
import { PaymentMethod, PaymentStatus } from '../types';
import { orderService, asaas, shippingService, emailService, pdfService, whatsappService } from '../services';
import { CreditCard, QrCode, ShieldCheck, CheckCircle2, ArrowLeft, Loader2, MapPin, Truck } from 'lucide-react';

// Helper function para calcular frete
async function calcularFreteLocal({ to_postal_code, products }) {
  const r = await fetch("/api/superfrete/cotacao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to_postal_code,
      services: "1,2,17",
      products
    })
  });

  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await r.json() : await r.text();

  if (!r.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  return data;
}

interface CheckoutProps {
  user: User;
  cart: CartItem[];
  storeConfig: StoreConfig | null;
  onSuccess: (order: Order) => void;
  onBack: () => void;
}

export const Checkout: React.FC<CheckoutProps> = ({
  user,
  cart,
  storeConfig,
  onSuccess,
  onBack,
}) => {
  const [step, setStep] = useState<'shipping' | 'payment' | 'confirmation'>('shipping');
  const [deliveryType, setDeliveryType] = useState<'shipping' | 'pickup'>('shipping');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(
    user.addresses.find(a => a.isDefault) || user.addresses[0] || null
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PIX);
  const [shippingMethod, setShippingMethod] = useState<{ id: string; name: string; cost: number } | null>(null);
  const [shippingQuote, setShippingQuote] = useState<{ cost: number; estimatedDays: string } | null>(null);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [qrCode, setQrCode] = useState<string | undefined>();

  const subtotal = cart.reduce((sum, item) => {
    const price = item.promotionalPrice || item.price;
    return sum + price * item.quantity;
  }, 0);

  const shippingCost = deliveryType === 'pickup' ? 0 : (shippingQuote?.cost || 0);
  const total = subtotal + shippingCost;

  const calculateShipping = async () => {
    if (!selectedAddress) return;
    setIsLoadingShipping(true);

    const result = await shippingService.calculateShipping(selectedAddress.zip, subtotal);
    if (result.success && result.quotes.length > 0) {
      const cheapest = result.quotes[0];
      setShippingQuote({ cost: cheapest.cost, estimatedDays: cheapest.estimatedDays });
      setShippingMethod({ id: cheapest.method.id, name: cheapest.method.name, cost: cheapest.cost });
    }

    setIsLoadingShipping(false);
  };

  const handleProceedToPayment = () => {
    if (deliveryType === 'pickup') {
      setStep('payment');
    } else {
      if (!selectedAddress) return;
      // Calcular frete automaticamente com CEP do endereço do usuário
      if (!shippingQuote) {
        calculateShippingWithUserAddress();
      } else {
        setStep('payment');
      }
    }
  };

  const calculateShippingWithUserAddress = async () => {
    setIsLoadingShipping(true);
    
    try {
      const products = cart.map(item => ({
        quantity: item.quantity,
        height: item.heightCm || 10,
        width: item.widthCm || 10,
        length: item.lengthCm || 10,
        weight: item.weightKg || 0.5
      }));

      const cotacao = await calcularFreteLocal({
        to_postal_code: selectedAddress.zip,
        products
      });

      if (cotacao && Array.isArray(cotacao) && cotacao.length > 0) {
        const primeiraOpcao = cotacao[0];
        setShippingQuote({ 
          cost: primeiraOpcao.price || primeiraOpcao.cost, 
          estimatedDays: primeiraOpcao.delivery_time || primeiraOpcao.estimatedDays 
        });
        setShippingMethod({ 
          id: primeiraOpcao.service_id || primeiraOpcao.id, 
          name: primeiraOpcao.company?.name || primeiraOpcao.name, 
          cost: primeiraOpcao.price || primeiraOpcao.cost 
        });
        setStep('payment');
      } else {
        // Fallback para cálculo manual
        const result = await shippingService.calculateShipping(selectedAddress.zip, subtotal);
        if (result.success && result.quotes.length > 0) {
          const cheapest = result.quotes[0];
          setShippingQuote({ cost: cheapest.cost, estimatedDays: cheapest.estimatedDays });
          setShippingMethod({ id: cheapest.method.id, name: cheapest.method.name, cost: cheapest.cost });
          setStep('payment');
        }
      }
    } catch (error) {
      console.error('Erro ao calcular frete:', error);
      alert('Erro ao calcular frete. Tente novamente.');
    }
    
    setIsLoadingShipping(false);
  };

  const handleCompleteOrder = async () => {
    setIsProcessing(true);

    try {
      // Create order
      const isPickup = deliveryType === 'pickup';
      
      const orderResult = await orderService.createOrder({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        items: cart,
        subtotal,
        shippingCost: isPickup ? 0 : shippingCost,
        discount: 0,
        total,
        paymentMethod,
        shippingMethod: isPickup ? {
          id: 'pickup',
          name: 'Retirada na Loja',
          type: 'retirada',
          cost: 0,
          estimatedDays: 'Imediato',
          isActive: true,
        } : {
          id: shippingMethod!.id,
          name: shippingMethod!.name,
          type: 'correios',
          cost: shippingMethod!.cost,
          estimatedDays: shippingQuote?.estimatedDays || '',
          isActive: true,
        },
        shippingAddress: isPickup ? {
          id: 'pickup-address',
          name: 'Retirada',
          street: 'Retirada na Loja',
          number: '-',
          neighborhood: '-',
          city: '-',
          state: '-',
          zip: '00000-000',
          isDefault: false,
        } : selectedAddress!,
      });

      if (!orderResult.success || !orderResult.order) {
        alert('Erro ao criar pedido');
        setIsProcessing(false);
        return;
      }

      const newOrder = orderResult.order;

      // Process payment with Asaas
      const paymentResult = await asaas.createOrderPayment(
        newOrder,
        {
          name: user.name,
          email: user.email,
          cpf: user.cpf,
          phone: user.phone,
          address: isPickup ? 'Retirada' : selectedAddress?.street,
          addressNumber: isPickup ? '-' : selectedAddress?.number,
          complement: isPickup ? '-' : selectedAddress?.complement,
          province: isPickup ? '-' : selectedAddress?.neighborhood,
          postalCode: isPickup ? '00000-000' : selectedAddress?.zip,
        }
      );

      if (paymentResult.success) {
        // Update order with payment info
        await orderService.updatePaymentStatus(newOrder.id, PaymentStatus.PENDING, {
          paymentId: paymentResult.paymentId,
          paymentQrCode: paymentResult.qrCode,
          paymentLink: paymentResult.invoiceUrl,
        });

        newOrder.paymentId = paymentResult.paymentId;
        newOrder.paymentQrCode = paymentResult.qrCode;
        newOrder.paymentLink = paymentResult.invoiceUrl;

        setOrder(newOrder);
        setQrCode(paymentResult.qrCode);
        setStep('confirmation');

        // Send confirmation email
        emailService.sendOrderConfirmation({
          orderNumber: newOrder.orderNumber,
          customerName: user.name,
          customerEmail: user.email,
          orderTotal: total,
          orderItems: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.promotionalPrice || i.price })),
          orderStatus: 'Pendente',
          paymentMethod: paymentMethod === PaymentMethod.PIX ? 'PIX' : paymentMethod === PaymentMethod.CREDIT_CARD ? 'Cartão de Crédito' : 'Cartão de Débito',
        });

        // Send WhatsApp notification to store
        whatsappService.sendOrderNotification(newOrder, isPickup);

        // Send WhatsApp notification to customer if phone exists
        if (user.phone) {
          whatsappService.sendCustomerNotification(newOrder, user.phone);
        }
      } else {
        alert('Erro ao processar pagamento: ' + paymentResult.error);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Erro ao processar checkout');
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

  // Shipping Step
  if (step === 'shipping') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar ao carrinho
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-8">Forma de Recebimento</h1>

        {/* Delivery Type Selection */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setDeliveryType('shipping')}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${
                deliveryType === 'shipping'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Truck className={`w-6 h-6 ${deliveryType === 'shipping' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="font-semibold text-gray-900">Entrega</span>
              </div>
              <p className="text-sm text-gray-500">Receba em seu endereço</p>
            </button>

            <button
              onClick={() => setDeliveryType('pickup')}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${
                deliveryType === 'pickup'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <MapPin className={`w-6 h-6 ${deliveryType === 'pickup' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="font-semibold text-gray-900">Retirada</span>
              </div>
              <p className="text-sm text-gray-500">Retire na loja (sem frete)</p>
            </button>
          </div>
        </div>

        {deliveryType === 'shipping' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              {user.addresses.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl">
                  <p className="text-yellow-800">Você precisa cadastrar um endereço antes de continuar.</p>
                </div>
              ) : (
                user.addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedAddress?.id === address.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddress?.id === address.id}
                      onChange={() => setSelectedAddress(address)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">{address.name}</span>
                        {address.isDefault && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Padrão</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {address.street}, {address.number}
                        {address.complement && ` - ${address.complement}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {address.neighborhood} - {address.city}, {address.state}
                      </p>
                      <p className="text-sm text-gray-600">CEP: {address.zip}</p>
                    </div>
                  </label>
                ))
              )}

              {selectedAddress && !shippingQuote && (
                <button
                  onClick={calculateShipping}
                  disabled={isLoadingShipping}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoadingShipping ? 'Calculando...' : 'Calcular Frete'}
                </button>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
              <h3 className="font-bold text-lg mb-6">Resumo</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Frete</span>
                  <span>
                    {shippingQuote
                      ? shippingQuote.cost === 0
                        ? 'Grátis'
                        : shippingQuote.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : 'A calcular'}
                  </span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
                  <span>Total</span>
                  <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>

              <button
                onClick={handleProceedToPayment}
                disabled={!selectedAddress || !shippingQuote}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar para Pagamento
              </button>
            </div>
          </div>
        ) : (
          // Pickup Option
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-bold text-lg text-gray-900">Retirada na Loja</h3>
                <p className="text-sm text-gray-500">Retire seu pedido presencialmente</p>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-xl mb-6">
              <p className="text-sm text-blue-800">
                <strong>Endereço da loja:</strong><br />
                Rua Exemplo, 123<br />
                Centro - São Luís, MA<br />
                CEP: 65000-000
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Horário de funcionamento: Seg-Sex 9h às 18h, Sáb 9h às 13h
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Frete (Retirada)</span>
                <span>Grátis</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
                <span>Total</span>
                <span>{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>

            <button
              onClick={handleProceedToPayment}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700"
            >
              Continuar para Pagamento
            </button>
          </div>
        )}
      </div>
    );
  }

  // Payment Step
  if (step === 'payment') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => setStep('shipping')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-8">Pagamento</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900">Entrega em:</span>
              </div>
              <p className="text-sm text-gray-600 ml-8">
                {selectedAddress?.street}, {selectedAddress?.number}<br />
                {shippingQuote?.estimatedDays}
              </p>
            </div>

            <h3 className="font-semibold text-gray-900 mb-4">Escolha a forma de pagamento</h3>

            <PaymentOption
              selected={paymentMethod === PaymentMethod.PIX}
              onClick={() => setPaymentMethod(PaymentMethod.PIX)}
              icon={<QrCode className="w-6 h-6" />}
              title="PIX"
              description="Pagamento instantâneo com QR Code"
            />

            <PaymentOption
              selected={paymentMethod === PaymentMethod.CREDIT_CARD}
              onClick={() => setPaymentMethod(PaymentMethod.CREDIT_CARD)}
              icon={<CreditCard className="w-6 h-6" />}
              title="Cartão de Crédito"
              description={`Parcele em até ${storeConfig?.paymentConfig?.maxInstallments || 6}x`}
            />

            <PaymentOption
              selected={paymentMethod === PaymentMethod.DEBIT_CARD}
              onClick={() => setPaymentMethod(PaymentMethod.DEBIT_CARD)}
              icon={<CreditCard className="w-6 h-6" />}
              title="Cartão de Débito"
              description="Pagamento à vista"
            />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
            <h3 className="font-bold text-lg mb-6">Resumo do Pedido</h3>

            <div className="space-y-3 mb-6 max-h-48 overflow-y-auto">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.quantity}x {item.name}</span>
                  <span className="font-medium">
                    {((item.promotionalPrice || item.price) * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3 mb-6 pt-4 border-t">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Frete ({shippingMethod?.name})</span>
                <span>{shippingCost === 0 ? 'Grátis' : shippingCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
                <span>Total</span>
                <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>

            <button
              onClick={handleCompleteOrder}
              disabled={isProcessing}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</>
              ) : (
                <>Finalizar Compra</>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
              <ShieldCheck className="w-4 h-4" />
              <span>Pagamento seguro processado via Asaas</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Confirmation Step
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Pedido Recebido!</h1>
      <p className="text-gray-500 mb-6">
        Obrigado pela sua compra. Seu pedido #{order?.orderNumber} foi processado com sucesso.
      </p>

      {qrCode && paymentMethod === PaymentMethod.PIX && (
        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-6">
          <p className="font-semibold text-blue-800 mb-4">Escaneie o QR Code para pagar</p>
          <img src={qrCode} alt="QR Code PIX" className="w-48 h-48 mx-auto rounded-lg" />
          <p className="text-sm text-blue-600 mt-4">
            O pedido será confirmado após o pagamento
          </p>
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <button
          onClick={() => onSuccess(order!)}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
        >
          Continuar Comprando
        </button>
        <button
          onClick={handlePrintReceipt}
          className="px-8 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50"
        >
          Ver Comprovante
        </button>
      </div>
    </div>
  );
};

const PaymentOption = ({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <button
    onClick={onClick}
    className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 text-left transition-all ${
      selected
        ? 'border-blue-600 bg-blue-50'
        : 'border-gray-200 hover:border-blue-300'
    }`}
  >
    <div className={`${selected ? 'text-blue-600' : 'text-gray-400'}`}>{icon}</div>
    <div className="flex-1">
      <div className="font-semibold text-gray-900">{title}</div>
      <div className="text-sm text-gray-500">{description}</div>
    </div>
    {selected && (
      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
        <div className="w-2 h-2 bg-white rounded-full" />
      </div>
    )}
  </button>
);
