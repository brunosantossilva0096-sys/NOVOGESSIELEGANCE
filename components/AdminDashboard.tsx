import React, { useState, useEffect } from 'react';
import { db, orderService, auth } from '../services';
import type { Product, Order, Category, StoreConfig, User } from '../types';
import { OrderStatus } from '../types';
import { Plus, Trash2, Edit, Save, X, Package, ShoppingBag, TrendingUp, Users, DollarSign, AlertCircle, CheckCircle, Truck, Calculator, UserPlus, TrendingDown, Upload } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface AdminDashboardProps {
  storeConfig: StoreConfig | null;
  onConfigUpdate: (config: StoreConfig) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  storeConfig,
  onConfigUpdate,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'products' | 'orders' | 'categories' | 'finance' | 'employees'>('stats');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    ordersPending: 0,
    ordersPaid: 0,
    ordersShipped: 0,
    lowStock: 0,
  });

  // Profit report state
  const [profitReport, setProfitReport] = useState<{
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
    totalOrders: number;
    averageOrderValue: number;
    salesByPaymentMethod: Record<string, number>;
    dailyBreakdown: { date: string; revenue: number; cost: number; profit: number; orders: number }[];
  } | null>(null);
  const [reportPeriod, setReportPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');

  // Employees state
  const [employees, setEmployees] = useState<User[]>([]);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    costPrice: 0,
    promotionalPrice: undefined,
    category: '',
    categoryId: '',
    stock: 0,
    minStock: 5,
    sizes: [],
    colors: [],
    images: [''],
    isActive: true,
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [prods, ords, cats, dashboardStats, profitRep, emps] = await Promise.all([
        db.getAllProducts(),
        orderService.getAllOrders(),
        db.getAllCategories(),
        orderService.getDashboardStats(),
        orderService.getProfitReport(),
        auth.getAllEmployees(),
      ]);

      setProducts(prods);
      setOrders(ords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setCategories(cats);
      setProfitReport(profitRep);
      setEmployees(emps);
      setCurrentUser(auth.getCurrentUser());

      setStats({
        totalSales: dashboardStats.totalSales,
        totalOrders: dashboardStats.totalOrders,
        totalProducts: prods.length,
        totalCustomers: 0,
        ordersPending: dashboardStats.ordersPending,
        ordersPaid: dashboardStats.ordersPaid,
        ordersShipped: dashboardStats.ordersShipped,
        lowStock: prods.filter(p => (p.minStock || 5) >= p.stock && p.isActive).length,
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploadingImage(true);
    try {
      const imageUrl = await db.uploadProductImage(file);
      setFormData(prev => ({
        ...prev,
        images: [imageUrl]
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erro ao enviar imagem');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price || !formData.categoryId) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const product: Product = {
      id: isEditing || `prod-${Date.now()}`,
      name: formData.name,
      description: formData.description || '',
      price: formData.price,
      promotionalPrice: formData.promotionalPrice,
      images: formData.images?.filter(Boolean) || ['https://via.placeholder.com/600'],
      category: categories.find(c => c.id === formData.categoryId)?.name || '',
      categoryId: formData.categoryId,
      stock: formData.stock || 0,
      sizes: formData.sizes || [],
      colors: formData.colors || [],
      tags: formData.tags || [],
      isActive: formData.isActive ?? true,
      createdAt: isEditing ? (products.find(p => p.id === isEditing)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (isEditing) {
        await db.updateProduct(product);
      } else {
        await db.addProduct(product);
      }

      setIsEditing(null);
      setIsAdding(false);
      setFormData({
        name: '', description: '', price: 0, promotionalPrice: undefined,
        category: '', categoryId: '', stock: 0, sizes: [], colors: [], images: [''], isActive: true,
      });
      refreshData();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Erro ao salvar produto');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      await db.deleteProduct(id);
      refreshData();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleCreateEmployee = async () => {
    if (!employeeForm.name || !employeeForm.email || !employeeForm.password) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const result = await auth.createEmployee({
      name: employeeForm.name,
      email: employeeForm.email,
      password: employeeForm.password,
      phone: employeeForm.phone,
    });

    if (result.success) {
      alert('Funcionário cadastrado com sucesso!');
      setShowEmployeeForm(false);
      setEmployeeForm({ name: '', email: '', password: '', phone: '' });
      refreshData();
    } else {
      alert(result.message || 'Erro ao cadastrar funcionário');
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    const result = await auth.toggleUserStatus(userId);
    if (result.success) {
      refreshData();
    } else {
      alert(result.message);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, status);
      refreshData();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'PAID': 'bg-green-100 text-green-800',
      'SHIPPED': 'bg-blue-100 text-blue-800',
      'DELIVERED': 'bg-purple-100 text-purple-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'REFUNDED': 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      'PENDING': 'Pendente',
      'PAID': 'Pago',
      'SHIPPED': 'Enviado',
      'DELIVERED': 'Entregue',
      'CANCELLED': 'Cancelado',
      'REFUNDED': 'Estornado',
    };
    return { className: styles[status] || 'bg-gray-100', label: labels[status] || status };
  };

  const chartData = [
    { name: 'Pendente', value: stats.ordersPending, color: '#fbbf24' },
    { name: 'Pago', value: stats.ordersPaid, color: '#22c55e' },
    { name: 'Enviado', value: stats.ordersShipped, color: '#3b82f6' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
          <p className="text-gray-500">Gerencie sua loja e acompanhe os resultados</p>
        </div>

        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg flex-wrap">
          {(['stats', 'products', 'orders', 'categories'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab === 'stats' && 'Visão Geral'}
              {tab === 'products' && 'Produtos'}
              {tab === 'orders' && 'Pedidos'}
              {tab === 'categories' && 'Categorias'}
            </button>
          ))}
          {currentUser?.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('finance')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'finance' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Financeiro
              </button>
              <button
                onClick={() => setActiveTab('employees')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'employees' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Funcionários
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={<DollarSign className="w-6 h-6 text-green-600" />}
              label="Vendas Totais"
              value={formatCurrency(stats.totalSales)}
            />
            <StatCard
              icon={<ShoppingBag className="w-6 h-6 text-blue-600" />}
              label="Total de Pedidos"
              value={stats.totalOrders.toString()}
            />
            <StatCard
              icon={<Package className="w-6 h-6 text-purple-600" />}
              label="Produtos Ativos"
              value={stats.totalProducts.toString()}
            />
            <StatCard
              icon={<AlertCircle className="w-6 h-6 text-red-600" />}
              label="Estoque Baixo"
              value={stats.lowStock.toString()}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-6">Status dos Pedidos</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-6">Pedidos Recentes</h3>
              <div className="space-y-3">
                {orders.slice(0, 5).map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">#{order.orderNumber}</p>
                      <p className="text-sm text-gray-500">{order.userName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(order.total)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(order.status).className}`}>
                        {getStatusBadge(order.status).label}
                      </span>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <p className="text-gray-500 text-center py-8">Nenhum pedido ainda</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="animate-in fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Catálogo de Produtos</h2>
            <button
              onClick={() => { setIsAdding(true); setFormData({ ...formData, id: undefined }); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Produto
            </button>
          </div>

          {/* Product Form Modal */}
          {(isAdding || isEditing) && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">{isEditing ? 'Editar' : 'Adicionar'} Produto</h3>
                  <button onClick={() => { setIsAdding(false); setIsEditing(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Nome</label>
                    <input
                      type="text"
                      className="w-full border border-gray-200 rounded-lg p-2.5"
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Descrição</label>
                    <textarea
                      className="w-full border border-gray-200 rounded-lg p-2.5 h-24"
                      value={formData.description || ''}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Categoria</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg p-2.5"
                      value={formData.categoryId}
                      onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Estoque</label>
                    <input
                      type="number"
                      className="w-full border border-gray-200 rounded-lg p-2.5"
                      value={formData.stock || 0}
                      onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Preço (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border border-gray-200 rounded-lg p-2.5"
                      value={formData.price || 0}
                      onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Preço Promocional (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border border-gray-200 rounded-lg p-2.5"
                      value={formData.promotionalPrice || ''}
                      onChange={e => setFormData({ ...formData, promotionalPrice: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Preço de Custo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border border-gray-200 rounded-lg p-2.5"
                      value={formData.costPrice || ''}
                      onChange={e => setFormData({ ...formData, costPrice: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Estoque Mínimo</label>
                    <input
                      type="number"
                      className="w-full border border-gray-200 rounded-lg p-2.5"
                      value={formData.minStock || ''}
                      onChange={e => setFormData({ ...formData, minStock: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1 text-gray-700">Foto do Produto</label>
                    <div className="flex flex-col gap-4">
                      {formData.images?.[0] && formData.images[0] !== 'https://via.placeholder.com/600' && (
                        <div className="relative w-32 h-32 group">
                          <img
                            src={formData.images[0]}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-xl border border-gray-200 shadow-sm"
                          />
                          <button
                            onClick={() => setFormData({ ...formData, images: [] })}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="product-image-upload"
                          onChange={handleImageUpload}
                          disabled={isUploadingImage}
                        />
                        <label
                          htmlFor="product-image-upload"
                          className={`flex flex-col items-center justify-center gap-3 w-full border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer
                            ${isUploadingImage ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-sm'}
                          `}
                        >
                          {isUploadingImage ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              <span className="text-sm font-medium text-gray-500">Enviando foto...</span>
                            </div>
                          ) : (
                            <>
                              <div className="p-3 bg-blue-50 rounded-full">
                                <Upload className="w-6 h-6 text-blue-600" />
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-semibold text-gray-700">Clique para enviar</p>
                                <p className="text-xs text-gray-500 mt-1">PNG, JPG ou WEBP até 5MB</p>
                              </div>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                      />
                      <span className="text-sm">Produto ativo</span>
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => { setIsAdding(false); setIsEditing(null); }}
                    className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveProduct}
                    className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Salvar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Products Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold text-sm">Produto</th>
                  <th className="px-6 py-4 font-semibold text-sm">Categoria</th>
                  <th className="px-6 py-4 font-semibold text-sm">Preço Venda</th>
                  <th className="px-6 py-4 font-semibold text-sm">Preço Custo</th>
                  <th className="px-6 py-4 font-semibold text-sm">Estoque</th>
                  <th className="px-6 py-4 font-semibold text-sm text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={p.images[0]} className="w-10 h-10 rounded-lg object-cover" alt={p.name} />
                        <div>
                          <span className="font-medium text-gray-900">{p.name}</span>
                          {!p.isActive && <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded">Inativo</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.category}</td>
                    <td className="px-6 py-4">
                      {p.promotionalPrice ? (
                        <div>
                          <span className="font-semibold text-green-600">{formatCurrency(p.promotionalPrice)}</span>
                          <span className="text-sm text-gray-400 line-through ml-2">{formatCurrency(p.price)}</span>
                        </div>
                      ) : (
                        <span className="font-semibold">{formatCurrency(p.price)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {p.costPrice ? formatCurrency(p.costPrice) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.stock <= (p.minStock || 5) ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                        {p.stock} / {p.minStock || 5} min
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setIsEditing(p.id); setFormData(p); }}
                          className="p-2 text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && !isLoading && (
              <div className="py-12 text-center text-gray-500">Nenhum produto cadastrado</div>
            )}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="animate-in fade-in">
          <h2 className="text-xl font-bold mb-6">Gerenciamento de Pedidos</h2>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold text-sm">Pedido</th>
                  <th className="px-6 py-4 font-semibold text-sm">Cliente</th>
                  <th className="px-6 py-4 font-semibold text-sm">Data</th>
                  <th className="px-6 py-4 font-semibold text-sm">Total</th>
                  <th className="px-6 py-4 font-semibold text-sm">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">#{o.orderNumber}</span>
                      <p className="text-xs text-gray-500">{o.items.length} itens</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{o.userName}</td>
                    <td className="px-6 py-4 text-sm">{formatDate(o.createdAt)}</td>
                    <td className="px-6 py-4 font-bold">{formatCurrency(o.total)}</td>
                    <td className="px-6 py-4">
                      <select
                        value={o.status}
                        onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                        className={`text-sm font-medium px-3 py-1.5 rounded-lg outline-none cursor-pointer ${getStatusBadge(o.status).className}`}
                      >
                        {Object.values(OrderStatus).map(s => (
                          <option key={s} value={s}>{getStatusBadge(s).label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="py-12 text-center text-gray-500">Nenhum pedido realizado ainda</div>
            )}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="animate-in fade-in">
          <h2 className="text-xl font-bold mb-6">Categorias</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                    <p className="text-sm text-gray-500">{cat.slug}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {cat.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">{cat.description || 'Sem descrição'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Finance Tab */}
      {activeTab === 'finance' && profitReport && (
        <div className="animate-in fade-in space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Relatório Financeiro</h2>
            <div className="flex gap-2">
              {(['today', 'week', 'month', 'year'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setReportPeriod(period)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${reportPeriod === period ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {period === 'today' && 'Hoje'}
                  {period === 'week' && 'Semana'}
                  {period === 'month' && 'Mês'}
                  {period === 'year' && 'Ano'}
                </button>
              ))}
            </div>
          </div>

          {/* Profit Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={<DollarSign className="w-6 h-6 text-green-600" />}
              label="Receita Total"
              value={formatCurrency(profitReport.totalRevenue)}
            />
            <StatCard
              icon={<TrendingDown className="w-6 h-6 text-red-600" />}
              label="Custo Total"
              value={formatCurrency(profitReport.totalCost)}
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
              label="Lucro Bruto"
              value={formatCurrency(profitReport.grossProfit)}
            />
            <StatCard
              icon={<CheckCircle className="w-6 h-6 text-purple-600" />}
              label="Margem de Lucro"
              value={`${profitReport.profitMargin.toFixed(1)}%`}
            />
          </div>

          {/* Daily Breakdown Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-6">Evolução Diária</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profitReport.dailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="revenue" stroke="#22c55e" name="Receita" strokeWidth={2} />
                  <Line type="monotone" dataKey="cost" stroke="#ef4444" name="Custo" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" stroke="#3b82f6" name="Lucro" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-6">Vendas por Forma de Pagamento</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(profitReport.salesByPaymentMethod).map(([method, value]) => (
                <div key={method} className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">
                    {method === 'PIX' && 'PIX'}
                    {method === 'CREDIT_CARD' && 'Cartão de Crédito'}
                    {method === 'DEBIT_CARD' && 'Cartão de Débito'}
                    {method === 'CASH' && 'Dinheiro'}
                    {method === 'BOLETO' && 'Boleto'}
                  </p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(Number(value))}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Employees Tab - Admin Only */}
      {activeTab === 'employees' && currentUser?.role === 'admin' && (
        <div className="animate-in fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Gerenciamento de Funcionários</h2>
            <button
              onClick={() => setShowEmployeeForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Novo Funcionário
            </button>
          </div>

          {/* Employee Form Modal */}
          {showEmployeeForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Cadastrar Funcionário</h3>
                  <button onClick={() => setShowEmployeeForm(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome</label>
                    <input
                      type="text"
                      className="w-full border border-gray-200 rounded-lg p-2.5"
                      value={employeeForm.name}
                      onChange={e => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">E-mail</label>
                    <input
                      type="email"
                      className="w-full border border-gray-200 rounded-lg p-2.5"
                      value={employeeForm.email}
                      onChange={e => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Senha</label>
                    <input
                      type="password"
                      className="w-full border border-gray-200 rounded-lg p-2.5"
                      value={employeeForm.password}
                      onChange={e => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Telefone</label>
                    <input
                      type="tel"
                      className="w-full border border-gray-200 rounded-lg p-2.5"
                      value={employeeForm.phone}
                      onChange={e => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowEmployeeForm(false)}
                    className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateEmployee}
                    className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Cadastrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Employees Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold text-sm">Nome</th>
                  <th className="px-6 py-4 font-semibold text-sm">E-mail</th>
                  <th className="px-6 py-4 font-semibold text-sm">Telefone</th>
                  <th className="px-6 py-4 font-semibold text-sm">Status</th>
                  <th className="px-6 py-4 font-semibold text-sm text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{emp.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{emp.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${emp.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                        {emp.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(emp.id)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium ${emp.isActive
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                          }`}
                      >
                        {emp.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {employees.length === 0 && (
              <div className="py-12 text-center text-gray-500">Nenhum funcionário cadastrado</div>
            )}
          </div>
        </div>
      )}

      {/* Employees Tab - Employee View (no access) */}
      {activeTab === 'employees' && currentUser?.role === 'employee' && (
        <div className="animate-in fade-in">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-yellow-800 mb-2">Acesso Restrito</h3>
            <p className="text-yellow-700">Apenas administradores podem gerenciar funcionários.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-gray-50 rounded-xl">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);
