import React, { useState, useEffect } from 'react';
import { User, Package, MapPin, CreditCard, LogOut, Plus, Trash2, Star, ChevronRight, Loader2 } from 'lucide-react';
import { auth, db, orderService } from '../services';
import type { User as UserType, Order, Address } from '../types';
import { pdfService } from '../services/pdf';

interface UserProfileProps {
  user: UserType;
  onUpdate: () => void;
  onNavigateToStore: () => void;
}

type TabType = 'orders' | 'addresses' | 'profile';

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onUpdate,
  onNavigateToStore,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('orders');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Address form state
  const [addressForm, setAddressForm] = useState({
    name: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zip: '',
  });

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab, user.id]);

  const loadOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const userOrders = await orderService.getUserOrders(user.id);
      setOrders(userOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleLogout = () => {
    auth.logout();
    window.location.reload();
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await auth.addAddress(user.id, {
      ...addressForm,
      isDefault: user.addresses.length === 0,
    });

    if (result.success) {
      setShowAddressForm(false);
      setAddressForm({
        name: '', street: '', number: '', complement: '',
        neighborhood: '', city: '', state: '', zip: '',
      });
      onUpdate();
    }

    setIsSubmitting(false);
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Tem certeza que deseja remover este endereço?')) return;

    const result = await auth.deleteAddress(user.id, addressId);
    if (result.success) {
      onUpdate();
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    const result = await auth.setDefaultAddress(user.id, addressId);
    if (result.success) {
      onUpdate();
    }
  };

  const formatZip = (value: string) => {
    return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const translateStatus = (status: string) => {
    const map: Record<string, string> = {
      'PENDING': 'Pendente',
      'PAID': 'Pago',
      'SHIPPED': 'Enviado',
      'DELIVERED': 'Entregue',
      'CANCELLED': 'Cancelado',
      'REFUNDED': 'Estornado',
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'PAID': 'bg-green-100 text-green-800',
      'SHIPPED': 'bg-blue-100 text-blue-800',
      'DELIVERED': 'bg-purple-100 text-purple-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'REFUNDED': 'bg-gray-100 text-gray-800',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">{user.name}</h2>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${activeTab === 'orders' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-700'
                }`}
            >
              <Package className="w-5 h-5" />
              Meus Pedidos
            </button>
            <button
              onClick={() => setActiveTab('addresses')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${activeTab === 'addresses' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-700'
                }`}
            >
              <MapPin className="w-5 h-5" />
              Endereços
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${activeTab === 'profile' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-700'
                }`}
            >
              <CreditCard className="w-5 h-5" />
              Dados Pessoais
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Meus Pedidos</h2>

              {isLoadingOrders ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Você ainda não fez nenhum pedido</p>
                  <button
                    onClick={onNavigateToStore}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    Ir às compras
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div>
                          <p className="font-bold text-gray-900">Pedido #{order.orderNumber}</p>
                          <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                            {translateStatus(order.status)}
                          </span>
                          <button
                            onClick={() => pdfService.openReceipt({
                              order,
                              storeName: 'GessiElegance Moda',
                              storeEmail: 'contato@gessielegance.com.br',
                            })}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Ver comprovante
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-500">Qtd: {item.quantity}</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                              R$ {((item.promotionalPrice || item.price) * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-sm text-gray-500">+ {order.items.length - 3} itens</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                          Total: <span className="font-bold text-gray-900">R$ {order.total.toFixed(2)}</span>
                        </p>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Meus Endereços</h2>
                <button
                  onClick={() => setShowAddressForm(!showAddressForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>

              {showAddressForm && (
                <form onSubmit={handleAddAddress} className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-semibold text-gray-900 mb-4">Novo Endereço</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Nome do endereço (ex: Casa, Trabalho)"
                        value={addressForm.name}
                        onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Rua"
                        value={addressForm.street}
                        onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Número"
                        value={addressForm.number}
                        onChange={(e) => setAddressForm({ ...addressForm, number: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Complemento"
                        value={addressForm.complement}
                        onChange={(e) => setAddressForm({ ...addressForm, complement: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Bairro"
                        value={addressForm.neighborhood}
                        onChange={(e) => setAddressForm({ ...addressForm, neighborhood: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Cidade"
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Estado"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        required
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="CEP"
                        value={addressForm.zip}
                        onChange={(e) => setAddressForm({ ...addressForm, zip: formatZip(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        required
                        maxLength={9}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {user.addresses.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhum endereço cadastrado</p>
                ) : (
                  user.addresses.map((address) => (
                    <div key={address.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{address.name}</h3>
                          {address.isDefault && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                              Padrão
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!address.isDefault && (
                            <button
                              onClick={() => handleSetDefaultAddress(address.id)}
                              className="p-2 text-gray-400 hover:text-blue-600"
                              title="Definir como padrão"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAddress(address.id)}
                            className="p-2 text-gray-400 hover:text-red-600"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {address.street}, {address.number}
                        {address.complement && ` - ${address.complement}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {address.neighborhood} - {address.city}, {address.state}
                      </p>
                      <p className="text-sm text-gray-600">{address.zip}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Dados Pessoais</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={user.name}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                  <input
                    type="text"
                    value={user.cpf || 'Não informado'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={user.phone || 'Não informado'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
              </div>

              <p className="mt-6 text-sm text-gray-500">
                Para alterar seus dados, entre em contato com o suporte.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
