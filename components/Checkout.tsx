import React, { useState, useCallback } from 'react';
import type { User, CartItem, Order, StoreConfig } from '../types';
import { PaymentMethod, PaymentStatus } from '../types';
import { orderService, emailService, pdfService, whatsappService } from '../services';
import { asaasService, cleanDocument } from '../services/asaas';
import {
  CreditCard, QrCode, ShieldCheck, CheckCircle2, ArrowLeft, Loader2, Copy, ExternalLink, Clock, Barcode
} from 'lucide-react';

interface CheckoutProps {
  user: User;
  cart: CartItem[];
  storeConfig: StoreConfig | null;
  shippingCost: number;
  onSuccess: (order: Order) => void;
  onBack: () => void;
}

type CheckoutStep = 'payment' | 'card-form' | 'confirmation';

interface CardFormData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  cpf: string;
  installments: number;
}

/* =========================================================
   Componente Principal
   ========================================================= */
export const Checkout: React.FC<CheckoutProps> = ({
  user,
  cart,
  storeConfig,
  shippingCost,
  onSuccess,
  onBack,
}) => {
  const [step, setStep] = useState<CheckoutStep>('payment');

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PIX);
  const [isProcessing, setIsProcessing] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentResult, setPaymentResult] = useState<{
    paymentId?: string;
    invoiceUrl?: string;
    qrCodeImage?: string;
    qrCodePayload?: string;
    qrCodeExpiration?: string;
    bankSlipUrl?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cardData, setCardData] = useState<CardFormData>({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
    cpf: user.cpf || '',
    installments: 1,
  });

  const subtotal = cart.reduce((sum, item) => {
    return sum + (item.promotionalPrice || item.price) * item.quantity;
  }, 0);
  const total = subtotal + shippingCost;

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatCardNumber = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19);
  };

  /* ----- Processar pagamento ----- */
  const processPayment = useCallback(async (cd?: CardFormData) => {
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Cria o pedido local
      const orderResult = await orderService.createOrder({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        items: cart,
        subtotal,
        shippingCost,
        discount: 0,
        total,
        paymentMethod,
        shippingMethod: {
          id: 'a-combinar',
          name: 'A combinar com vendedor',
          type: 'retirada',
          cost: shippingCost,
          estimatedDays: 'Imediato',
          isActive: true,
        },
        shippingAddress: {
          id: 'default',
          name: user.name,
          street: user.addresses?.[0]?.street || 'Entrega Digital',
          number: user.addresses?.[0]?.number || '-',
          neighborhood: user.addresses?.[0]?.neighborhood || '-',
          city: user.addresses?.[0]?.city || '-',
          state: user.addresses?.[0]?.state || '-',
          zip: user.addresses?.[0]?.zip || '00000-000',
          isDefault: false,
        },
      });

      if (!orderResult.success || !orderResult.order) {
        throw new Error('Falha ao criar pedido local.');
      }

      const createdOrder = orderResult.order;

      // 2. Cria cobrança no Asaas
      const asaasResult = await asaasService.createOrderPayment({
        order: createdOrder,
        customer: {
          name: user.name,
          email: user.email,
          cpfCnpj: cleanDocument(cd?.cpf || user.cpf || '00000000000'),
          phone: user.phone,
          postalCode: user.addresses?.[0]?.zip?.replace('-', '') || '',
          address: user.addresses?.[0]?.street || '',
          addressNumber: user.addresses?.[0]?.number || '',
          complement: user.addresses?.[0]?.complement || '',
          province: user.addresses?.[0]?.neighborhood || '',
        },
        cardData: cd ? {
          holderName: cd.holderName,
          number: cd.number.replace(/\s/g, ''),
          expiryMonth: cd.expiryMonth,
          expiryYear: cd.expiryYear,
          ccv: cd.ccv,
          installments: cd.installments,
        } : undefined,
      });

      if (!asaasResult.success) {
        throw new Error(asaasResult.error || 'Erro ao crear cobrança no Asaas');
      }

      // 3. Atualiza pedido com dados do pagamento
      await orderService.updatePaymentStatus(createdOrder.id, PaymentStatus.PENDING, {
        paymentId: asaasResult.paymentId,
        paymentLink: asaasResult.invoiceUrl,
        paymentQrCode: asaasResult.qrCodeImage,
      });

      // 4. Notificações
      emailService.sendOrderConfirmation({
        orderNumber: createdOrder.orderNumber,
        customerName: user.name,
        customerEmail: user.email,
        orderTotal: total,
        orderItems: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.promotionalPrice || i.price })),
        orderStatus: 'Aguardando Pagamento',
        paymentMethod: paymentMethod === PaymentMethod.PIX ? 'PIX' : 'Cartão',
      });

      whatsappService.sendOrderNotification(createdOrder, false);
      if (user.phone) whatsappService.sendCustomerNotification(createdOrder, user.phone);

      // 5. Atualiza estado
      setOrder(createdOrder);
      setPaymentResult({
        paymentId: asaasResult.paymentId,
        invoiceUrl: asaasResult.invoiceUrl,
        qrCodeImage: asaasResult.qrCodeImage,
        qrCodePayload: asaasResult.qrCodePayload,
        qrCodeExpiration: asaasResult.qrCodeExpiration,
        bankSlipUrl: asaasResult.bankSlipUrl,
      });
      setStep('confirmation');
    } catch (err) {
      console.error('[Checkout] Erro:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar pagamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  }, [user, cart, subtotal, shippingCost, total, paymentMethod]);

  const handleCompleteOrder = () => {
    if (paymentMethod === PaymentMethod.CREDIT_CARD || paymentMethod === PaymentMethod.DEBIT_CARD) {
      setStep('card-form');
    } else {
      processPayment();
    }
  };

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processPayment(cardData);
  };

  const copyPixCode = () => {
    if (paymentResult?.qrCodePayload) {
      navigator.clipboard.writeText(paymentResult.qrCodePayload).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }
  };

  /* =========================================================
     STEP: Confirmation
     ========================================================= */
  if (step === 'confirmation') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Pedido Confirmado!</h2>
          <p className="text-gray-500">Pedido #{order?.orderNumber} registrado com sucesso</p>
        </div>

        {/* Resumo */}
        {order && (
          <div className="bg-gray-50 rounded-xl p-5 mb-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Nº do Pedido</span>
              <span className="font-semibold">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-green-600 text-base">{formatCurrency(order.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Método</span>
              <span className="font-medium">
                {paymentMethod === PaymentMethod.PIX ? '⚡ PIX' :
                  paymentMethod === PaymentMethod.CREDIT_CARD ? '💳 Cartão de Crédito' :
                    paymentMethod === PaymentMethod.DEBIT_CARD ? '💳 Cartão de Débito' : 'Boleto'}
              </span>
            </div>
          </div>
        )}

        {/* QR Code PIX */}
        {paymentMethod === PaymentMethod.PIX && paymentResult?.qrCodeImage && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-5">
            <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5" /> Pague via PIX
            </h3>
            <div className="flex flex-col items-center gap-4">
              <img
                src={paymentResult.qrCodeImage}
                alt="QR Code PIX"
                className="w-48 h-48 border-4 border-white rounded-xl shadow"
              />
              {paymentResult.qrCodeExpiration && (
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Válido até {new Date(paymentResult.qrCodeExpiration).toLocaleString('pt-BR')}
                </p>
              )}
              {paymentResult.qrCodePayload && (
                <div className="w-full">
                  <p className="text-xs text-gray-500 mb-1">Copie o código PIX:</p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={paymentResult.qrCodePayload}
                      className="flex-1 text-xs bg-white border rounded-lg p-2 truncate"
                    />
                    <button
                      onClick={copyPixCode}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Link de pagamento (Boleto / Cartão / Fallback PIX) */}
        {paymentResult?.invoiceUrl && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-3">
            <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <ExternalLink className="w-5 h-5" /> Pagamento Digital (Automático)
            </h3>
            <p className="text-sm text-amber-700 mb-3">
              Acesse o link gerado para seu pedido na plataforma Asaas:
            </p>
            <a
              href={paymentResult.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir Fatura Automática
            </a>
          </div>
        )}

        {/* Link de Pagamento Manual (Solicitado pelo Usuário) */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-5">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <ExternalLink className="w-5 h-5" /> Pagamento com Frete Combinado
          </h3>
          <p className="text-sm text-blue-700 mb-3">
            Caso tenha combinado o frete e queira usar o link direto:
          </p>
          <a
            href="https://www.asaas.com/c/siak23mklgcai3yb"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Pagar via Link Direto
          </a>
        </div>

        {/* Boleto */}
        {paymentResult?.bankSlipUrl && (
          <div className="bg-gray-50 border rounded-xl p-5 mb-5">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Barcode className="w-5 h-5" /> Boleto Bancário
            </h3>
            <a
              href={paymentResult.bankSlipUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-xl font-medium transition-colors"
            >
              Baixar Boleto
            </a>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-3">
          <button
            onClick={() => order && pdfService.openReceipt({
              order,
              storeName: storeConfig?.name || 'GessiElegance',
              storeEmail: storeConfig?.contactEmail,
              storePhone: storeConfig?.contactPhone,
            })}
            className="flex-1 py-3 border-2 border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors font-medium"
          >
            Comprovante
          </button>
          <button
            onClick={() => onSuccess(order!)}
            className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     STEP: Card Form
     ========================================================= */
  if (step === 'card-form') {
    const maxInstallments = storeConfig?.paymentConfig?.maxInstallments ?? 3;

    return (
      <div className="max-w-lg mx-auto p-6 bg-white rounded-2xl shadow-xl">
        <button onClick={() => setStep('payment')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h2 className="text-xl font-bold mb-6">Dados do Cartão</h2>

        <form onSubmit={handleCardSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome no Cartão</label>
            <input
              required
              placeholder="NOME COMO NO CARTÃO"
              value={cardData.holderName}
              onChange={e => setCardData(p => ({ ...p, holderName: e.target.value.toUpperCase() }))}
              className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número do Cartão</label>
            <input
              required
              placeholder="0000 0000 0000 0000"
              value={cardData.number}
              onChange={e => setCardData(p => ({ ...p, number: formatCardNumber(e.target.value) }))}
              className="w-full border rounded-xl p-3 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              maxLength={19}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
              <input
                required
                placeholder="MM"
                maxLength={2}
                value={cardData.expiryMonth}
                onChange={e => setCardData(p => ({ ...p, expiryMonth: e.target.value.replace(/\D/g, '') }))}
                className="w-full border rounded-xl p-3 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
              <input
                required
                placeholder="AAAA"
                maxLength={4}
                value={cardData.expiryYear}
                onChange={e => setCardData(p => ({ ...p, expiryYear: e.target.value.replace(/\D/g, '') }))}
                className="w-full border rounded-xl p-3 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
              <input
                required
                placeholder="000"
                maxLength={4}
                value={cardData.ccv}
                onChange={e => setCardData(p => ({ ...p, ccv: e.target.value.replace(/\D/g, '') }))}
                className="w-full border rounded-xl p-3 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF do Titular</label>
            <input
              required
              placeholder="000.000.000-00"
              value={cardData.cpf}
              onChange={e => setCardData(p => ({ ...p, cpf: e.target.value }))}
              className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {paymentMethod === PaymentMethod.CREDIT_CARD && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Simulação de Parcelas</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: maxInstallments }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCardData(p => ({ ...p, installments: n }))}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${cardData.installments === n
                      ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-50'
                      : 'border-gray-100 hover:border-blue-200 bg-white'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-sm font-bold ${cardData.installments === n ? 'text-blue-700' : 'text-gray-900'}`}>{n}x</span>
                      {n === 1 && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold uppercase">Sem Juros</span>}
                    </div>
                    <p className={`text-sm font-bold ${cardData.installments === n ? 'text-blue-600' : 'text-gray-700'}`}>
                      {formatCurrency(total / n)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full bg-green-600 text-white py-4 rounded-xl hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</> : `Pagar ${formatCurrency(total)}`}
          </button>
        </form>
      </div>
    );
  }

  /* =========================================================
     STEP: Payment Method Selection
     ========================================================= */
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-5 h-5" /> Voltar
        </button>
        <h2 className="text-2xl font-bold">Finalizar Pedido</h2>
        <div className="w-20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Resumo */}
        <div>
          <h3 className="font-semibold text-gray-700 mb-4">Resumo do Pedido</h3>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            {cart.map((item, i) => (
              <div key={i} className="flex justify-between items-center pb-3 border-b last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.quantity}x {formatCurrency(item.promotionalPrice || item.price)}</p>
                </div>
                <p className="font-semibold text-sm">{formatCurrency((item.promotionalPrice || item.price) * item.quantity)}</p>
              </div>
            ))}
            <div className="pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Frete</span>
                <span className={shippingCost === 0 ? 'text-green-600 font-medium' : ''}>
                  {shippingCost > 0 ? formatCurrency(shippingCost) : 'A combinar'}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span><span className="text-green-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Método de pagamento */}
        <div>
          <h3 className="font-semibold text-gray-700 mb-4">Método de Pagamento</h3>
          <div className="space-y-3">
            {[
              { method: PaymentMethod.PIX, icon: <QrCode className="w-6 h-6 text-green-500" />, label: 'PIX', desc: 'Pagamento instantâneo — aprovação imediata' },
              { method: PaymentMethod.CREDIT_CARD, icon: <CreditCard className="w-6 h-6 text-blue-500" />, label: 'Cartão de Crédito', desc: `Parcele em até ${storeConfig?.paymentConfig?.maxInstallments ?? 3}x` },
              { method: PaymentMethod.DEBIT_CARD, icon: <CreditCard className="w-6 h-6 text-indigo-500" />, label: 'Cartão de Débito', desc: 'Débito na hora' },
            ].map(({ method, icon, label, desc }) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === method
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {icon}
                  <div>
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>

                    {/* Simulação de Parcelas */}
                    {method === PaymentMethod.CREDIT_CARD && paymentMethod === PaymentMethod.CREDIT_CARD && (
                      <div className="mt-4 grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-300">
                        {Array.from({ length: storeConfig?.paymentConfig?.maxInstallments ?? 3 }, (_, i) => i + 1).map(n => (
                          <div key={n} className="bg-white/80 p-2 rounded-lg border border-green-100 flex justify-between items-baseline gap-1">
                            <span className="text-[10px] font-medium text-neutral-500">{n}x</span>
                            <span className="text-xs font-bold text-green-700">{formatCurrency(total / n)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {paymentMethod === method && (
                    <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-blue-900 text-sm">Pagamento Seguro via Asaas</p>
              <p className="text-xs text-blue-700 mt-1">
                Seus dados são criptografados. Processado pela plataforma Asaas, certificada pelo Banco Central.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleCompleteOrder}
            disabled={isProcessing}
            className="w-full mt-5 bg-green-600 text-white py-4 rounded-xl hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold text-lg transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</>
              : `Pagar ${formatCurrency(total)}`
            }
          </button>
        </div>
      </div>
    </div>
  );
};
