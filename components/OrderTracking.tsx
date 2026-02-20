import React, { useState, useEffect } from 'react';
import { orderService } from '../services/orders';
import type { Order, CartItem } from '../types';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ArrowLeft,
  ShoppingBag,
  MapPin,
  CreditCard,
  User
} from 'lucide-react';
import { theme } from '../theme';

interface OrderTrackingProps {
  orderId: string;
  onBack: () => void;
}

const OrderTracking: React.FC<OrderTrackingProps> = ({ orderId, onBack }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!orderId) {
        setError('ID do pedido não fornecido');
        return;
      }

      const foundOrder = await orderService.getOrderById(orderId);
      
      if (!foundOrder) {
        setError('Pedido não encontrado');
        return;
      }

      setOrder(foundOrder);
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Erro ao carregar pedido');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-6 h-6" style={{ color: theme.colors.warning }} />;
      case 'PAID':
        return <CheckCircle className="w-6 h-6" style={{ color: theme.colors.success }} />;
      case 'SHIPPED':
        return <Truck className="w-6 h-6" style={{ color: theme.colors.primary[500] }} />;
      case 'DELIVERED':
        return <CheckCircle className="w-6 h-6" style={{ color: theme.colors.success }} />;
      case 'CANCELLED':
        return <AlertCircle className="w-6 h-6" style={{ color: theme.colors.error }} />;
      default:
        return <Package className="w-6 h-6" style={{ color: theme.colors.neutral[400] }} />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'PENDING': 'Pendente',
      'PAID': 'Pago',
      'SHIPPED': 'Enviado',
      'DELIVERED': 'Entregue',
      'CANCELLED': 'Cancelado',
      'REFUNDED': 'Reembolsado'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return theme.colors.warning;
      case 'PAID':
      case 'DELIVERED':
        return theme.colors.success;
      case 'SHIPPED':
        return theme.colors.primary[500];
      case 'CANCELLED':
      case 'REFUNDED':
        return theme.colors.error;
      default:
        return theme.colors.neutral[400];
    }
  };

  const getPaymentMethodText = (method: string) => {
    const methodMap: Record<string, string> = {
      'PIX': 'PIX',
      'CREDIT_CARD': 'Cartão de Crédito',
      'DEBIT_CARD': 'Cartão de Débito',
      'CASH': 'Dinheiro',
      'BOLETO': 'Boleto'
    };
    return methodMap[method] || method;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.colors.neutral[50] }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: theme.colors.primary[500] }}></div>
          <p style={{ color: theme.colors.neutral[600] }}>Carregando pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.colors.neutral[50] }}>
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: theme.colors.error }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: theme.colors.neutral[800] }}>
            {error || 'Pedido não encontrado'}
          </h2>
          <p className="mb-6" style={{ color: theme.colors.neutral[600] }}>
            Não conseguimos encontrar o pedido solicitado. Verifique o link ou tente novamente.
          </p>
          <button 
            onClick={onBack}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-white"
            style={{ backgroundColor: theme.colors.primary[500] }}
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar para a loja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: theme.colors.neutral[50] }}>
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={onBack}
              className="flex items-center gap-2"
              style={{ color: theme.colors.primary[600] }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Voltar</span>
            </button>
            <h1 className="text-lg font-bold" style={{ color: theme.colors.neutral[800] }}>
              Pedido #{order.orderNumber}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Status Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: getStatusColor(order.status) + '20' }}
            >
              {getStatusIcon(order.status)}
            </div>
            <div>
              <p className="text-sm mb-1" style={{ color: theme.colors.neutral[500] }}>Status do pedido</p>
              <h2 className="text-xl font-bold" style={{ color: getStatusColor(order.status) }}>
                {getStatusText(order.status)}
              </h2>
            </div>
          </div>
          
          <div className="border-t pt-4" style={{ borderColor: theme.colors.neutral[100] }}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p style={{ color: theme.colors.neutral[500] }}>Data do pedido</p>
                <p className="font-medium" style={{ color: theme.colors.neutral[800] }}>
                  {formatDate(order.createdAt)}
                </p>
              </div>
              <div>
                <p style={{ color: theme.colors.neutral[500] }}>Pagamento</p>
                <p className="font-medium" style={{ color: theme.colors.neutral[800] }}>
                  {getPaymentMethodText(order.paymentMethod)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-5 h-5" style={{ color: theme.colors.primary[500] }} />
            <h3 className="font-bold" style={{ color: theme.colors.neutral[800] }}>Itens do pedido</h3>
          </div>
          
          <div className="space-y-4">
            {order.items.map((item: CartItem, index: number) => (
              <div key={index} className="flex items-center gap-4 pb-4 border-b last:border-0 last:pb-0" style={{ borderColor: theme.colors.neutral[100] }}>
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-sm" style={{ color: theme.colors.neutral[800] }}>
                    {item.name}
                  </h4>
                  <p className="text-sm" style={{ color: theme.colors.neutral[500] }}>
                    {item.quantity}x {formatCurrency(item.promotionalPrice || item.price)}
                  </p>
                </div>
                <p className="font-bold" style={{ color: theme.colors.primary[600] }}>
                  {formatCurrency((item.promotionalPrice || item.price) * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t mt-4 pt-4" style={{ borderColor: theme.colors.neutral[100] }}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: theme.colors.neutral[500] }}>Subtotal</span>
                <span style={{ color: theme.colors.neutral[800] }}>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.shippingCost > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: theme.colors.neutral[500] }}>Frete</span>
                  <span style={{ color: theme.colors.neutral[800] }}>{formatCurrency(order.shippingCost)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: theme.colors.neutral[500] }}>Desconto</span>
                  <span style={{ color: theme.colors.success }}>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t" style={{ borderColor: theme.colors.neutral[100] }}>
                <span style={{ color: theme.colors.neutral[800] }}>Total</span>
                <span style={{ color: theme.colors.primary[600] }}>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5" style={{ color: theme.colors.primary[500] }} />
            <h3 className="font-bold" style={{ color: theme.colors.neutral[800] }}>Dados do cliente</h3>
          </div>
          
          <div className="space-y-3 text-sm">
            <div>
              <p style={{ color: theme.colors.neutral[500] }}>Nome</p>
              <p className="font-medium" style={{ color: theme.colors.neutral[800] }}>{order.userName}</p>
            </div>
            {order.userPhone && (
              <div>
                <p style={{ color: theme.colors.neutral[500] }}>Telefone</p>
                <p className="font-medium" style={{ color: theme.colors.neutral[800] }}>{order.userPhone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Shipping Info */}
        {order.shippingMethod.type !== 'retirada' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5" style={{ color: theme.colors.primary[500] }} />
              <h3 className="font-bold" style={{ color: theme.colors.neutral[800] }}>Endereço de entrega</h3>
            </div>
            
            <div className="text-sm" style={{ color: theme.colors.neutral[700] }}>
              <p className="font-medium">{order.shippingAddress.street}, {order.shippingAddress.number}</p>
              {order.shippingAddress.complement && <p>{order.shippingAddress.complement}</p>}
              <p>{order.shippingAddress.neighborhood}</p>
              <p>{order.shippingAddress.city} - {order.shippingAddress.state}</p>
              <p>CEP: {order.shippingAddress.zip}</p>
            </div>

            {order.trackingCode && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.colors.neutral[100] }}>
                <p style={{ color: theme.colors.neutral[500] }} className="text-sm mb-1">Código de rastreamento</p>
                <p className="font-medium" style={{ color: theme.colors.primary[600] }}>{order.trackingCode}</p>
              </div>
            )}
          </div>
        )}

        {order.shippingMethod.type === 'retirada' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5" style={{ color: theme.colors.primary[500] }} />
              <h3 className="font-bold" style={{ color: theme.colors.neutral[800] }}>Forma de retirada</h3>
            </div>
            <p className="text-sm" style={{ color: theme.colors.neutral[700] }}>
              Retirada presencial na loja
            </p>
          </div>
        )}

        {/* Payment Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5" style={{ color: theme.colors.primary[500] }} />
            <h3 className="font-bold" style={{ color: theme.colors.neutral[800] }}>Pagamento</h3>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span style={{ color: theme.colors.neutral[500] }}>Método</span>
              <span className="font-medium" style={{ color: theme.colors.neutral[800] }}>
                {getPaymentMethodText(order.paymentMethod)}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: theme.colors.neutral[500] }}>Status</span>
              <span className="font-medium" style={{ color: getStatusColor(order.paymentStatus) }}>
                {order.paymentStatus === 'PENDING' ? 'Pendente' : 
                 order.paymentStatus === 'CONFIRMED' || order.paymentStatus === 'RECEIVED' ? 'Confirmado' : 
                 order.paymentStatus === 'CANCELLED' ? 'Cancelado' : order.paymentStatus}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
