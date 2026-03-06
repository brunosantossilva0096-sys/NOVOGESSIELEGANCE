import type { Order, CartItem } from '../types';

// Número padrão para notificações (número da loja/admin)
const DEFAULT_WHATSAPP_NUMBER = '+55 98 985381823';

// URL base do site - será usada para gerar links de rastreamento
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://gessielegance.com';
};

/**
 * Gera o link de rastreamento do pedido
 */
export const generateOrderTrackingLink = (orderId: string): string => {
  return `${getBaseUrl()}/pedido/${orderId}`;
};

/**
 * Formata o número de telefone para o formato internacional
 * Remove espaços, parênteses e outros caracteres não numéricos
 */
const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('55')) {
    return cleaned;
  }
  return `55${cleaned}`;
};

/**
 * Formata a mensagem de notificação de novo pedido
 */
const formatOrderMessage = (
  order: Order,
  trackingLink: string,
  isRetirada: boolean = true
): string => {
  const items = order.items.map((item: CartItem) => {
    const price = item.promotionalPrice || item.price;
    return `${item.quantity}x ${item.name} - ${formatCurrency(price * item.quantity)}`;
  }).join('\n');

  const paymentMethodMap: Record<string, string> = {
    'PIX': 'PIX',
    'CREDIT_CARD': 'Cartão de Crédito',
    'DEBIT_CARD': 'Cartão de Débito',
    'CASH': 'Dinheiro',
    'BOLETO': 'Boleto'
  };

  const message = `*Gessi.Elegance - Novo Pedido*

*Pedido #${order.orderNumber}*

*DETALHES DO PEDIDO*
${items}

*DADOS DO CLIENTE*
Nome: ${order.userName}
Telefone: ${order.userPhone || 'Não informado'}

*DETALHES DA ENTREGA*
Forma: ${isRetirada ? 'Retirada' : 'Entrega'}
${isRetirada ? '' : `Endereço: ${order.shippingAddress.street}, ${order.shippingAddress.number}`}

*VALORES E PAGAMENTO*
${order.items.length} ${order.items.length === 1 ? 'item' : 'itens'}
Forma de pagamento: ${paymentMethodMap[order.paymentMethod] || order.paymentMethod}
Total: *${formatCurrency(order.total)}*

*🔗 LINK DE ACOMPANHAMENTO*
${trackingLink}

---
Gessi.Elegance
https://gessielegance.com`;

  return message;
};

/**
 * Formata valor para moeda brasileira
 */
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Abre o WhatsApp Web com a mensagem pré-preenchida
 * Isso redireciona o usuário para o WhatsApp Web onde ele pode enviar a mensagem
 */
export const sendOrderNotification = (order: Order, isRetirada: boolean = true): void => {
  const trackingLink = generateOrderTrackingLink(order.id);
  const message = formatOrderMessage(order, trackingLink, isRetirada);

  // Formata o número de telefone
  const formattedPhone = formatPhoneNumber(DEFAULT_WHATSAPP_NUMBER);

  // Codifica a mensagem para URL
  const encodedMessage = encodeURIComponent(message);

  // Gera o link do WhatsApp
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

  // Abre em nova aba
  window.open(whatsappUrl, '_blank');
};

/**
 * Envia notificação de pedido para o cliente
 */
export const sendCustomerNotification = (order: Order, customerPhone: string): void => {
  const trackingLink = generateOrderTrackingLink(order.id);

  const message = `*Gessi.Elegance*

Olá ${order.userName}! Recebemos seu pedido #${order.orderNumber}.

Você pode acompanhar seu pedido aqui:
${trackingLink}

Obrigada por comprar conosco!

---
Gessi.Elegance
https://gessielegance.com`;

  const formattedPhone = formatPhoneNumber(customerPhone);
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

  window.open(whatsappUrl, '_blank');
};

/**
 * Serviço de WhatsApp para notificações
 */
export const whatsappService = {
  sendOrderNotification,
  sendCustomerNotification,
  generateOrderTrackingLink,
  DEFAULT_WHATSAPP_NUMBER
};

export default whatsappService;
