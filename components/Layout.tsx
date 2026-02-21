import React, { useState } from 'react';
import { ShoppingCart, User, Menu, X, LogOut, LayoutDashboard, Search, Heart, Store, Calculator } from 'lucide-react';
import type { User as UserType, Category, StoreConfig } from '../types';
import { theme } from '../theme';

interface LayoutProps {
  children: React.ReactNode;
  user: UserType | null;
  cartCount: number;
  categories: Category[];
  storeConfig: StoreConfig | null;
  onLogout: () => void;
  onViewChange: (view: 'store' | 'admin' | 'profile' | 'cart' | 'checkout' | 'login' | 'register' | 'forgot-password' | 'pdv') => void;
  currentView: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  user,
  cartCount,
  categories,
  storeConfig,
  onLogout,
  onViewChange,
  currentView,
  searchQuery,
  onSearchChange,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const storeName = storeConfig?.name || 'Gessi Elegance';

  const isActiveView = (view: string) => currentView === view;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: theme.colors.primary[50] }}>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{
        backgroundColor: 'rgba(253, 245, 245, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${theme.colors.primary[200]}`
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <button
                onClick={() => onViewChange('store')}
                className="text-3xl font-bold tracking-tight transition-all hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary[600]} 0%, ${theme.colors.primary[500]} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                {storeName}
              </button>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-8">
                <button
                  onClick={() => onViewChange('store')}
                  className="text-sm font-medium transition-colors relative py-5"
                  style={{ color: isActiveView('store') ? theme.colors.primary[600] : theme.colors.neutral[600] }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.primary[600]}
                  onMouseLeave={(e) => !isActiveView('store') && (e.currentTarget.style.color = theme.colors.neutral[600])}
                >
                  Início
                  {isActiveView('store') && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: theme.colors.primary[500] }} />
                  )}
                </button>

                {/* Categories Dropdown */}
                <div className="relative">
                  <button
                    onMouseEnter={(e) => {
                      setShowCategories(true);
                      e.currentTarget.style.color = theme.colors.primary[600];
                    }}
                    onMouseLeave={(e) => {
                      setShowCategories(false);
                      e.currentTarget.style.color = theme.colors.neutral[600];
                    }}
                    className="text-sm font-medium transition-colors py-5"
                    style={{ color: theme.colors.neutral[600] }}
                  >
                    Categorias
                  </button>

                  {showCategories && categories.length > 0 && (
                    <div
                      onMouseEnter={() => setShowCategories(true)}
                      onMouseLeave={() => setShowCategories(false)}
                      className="absolute top-full left-0 w-56 rounded-2xl shadow-xl py-2 z-50"
                      style={{
                        backgroundColor: 'white',
                        border: `1px solid ${theme.colors.primary[200]}`
                      }}
                    >
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => { onViewChange('store'); setShowCategories(false); }}
                          className="block w-full text-left px-4 py-3 text-sm transition-all hover:pl-6"
                          style={{ color: theme.colors.neutral[700] }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.colors.primary[50];
                            e.currentTarget.style.color = theme.colors.primary[600];
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = theme.colors.neutral[700];
                          }}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onViewChange('store')}
                  className="text-sm font-medium transition-colors py-5"
                  style={{ color: theme.colors.neutral[600] }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.primary[600]}
                  onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.neutral[600]}
                >
                  Novidades
                </button>

                <button
                  onClick={() => onViewChange('store')}
                  className="text-sm font-medium transition-colors py-5"
                  style={{ color: theme.colors.neutral[600] }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.primary[600]}
                  onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.neutral[600]}
                >
                  Promoções
                </button>
              </nav>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-5">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  className="w-64 pl-11 pr-4 py-2.5 rounded-full text-sm transition-all focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'white',
                    border: `2px solid ${theme.colors.primary[200]}`,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.primary[500];
                    e.currentTarget.style.boxShadow = theme.shadows.pink;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.primary[200];
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  value={searchQuery || ''}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: theme.colors.primary[400] }} />
              </div>

              {/* Cart */}
              <button
                onClick={() => onViewChange('cart')}
                className="relative p-3 rounded-full transition-all hover:scale-110"
                style={{ backgroundColor: theme.colors.primary[100] }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.primary[200];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.primary[100];
                }}
              >
                <ShoppingCart className="w-5 h-5" style={{ color: theme.colors.primary[600] }} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
                    style={{ background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)` }}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>

              {/* Wishlist */}
              <button
                className="p-3 rounded-full transition-all hover:scale-110"
                style={{ backgroundColor: theme.colors.primary[100] }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.primary[200];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.primary[100];
                }}
              >
                <Heart className="w-5 h-5" style={{ color: theme.colors.primary[600] }} />
              </button>

              {/* User Menu */}
              {user ? (
                <div className="flex items-center gap-3 pl-5 border-l" style={{ borderColor: theme.colors.primary[200] }}>
                  {(user.role === 'admin' || user.role === 'employee') && (
                    <>
                      <button
                        onClick={() => onViewChange('pdv')}
                        className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all"
                        style={{
                          backgroundColor: isActiveView('pdv') ? theme.colors.primary[600] : theme.colors.primary[100],
                          color: isActiveView('pdv') ? 'white' : theme.colors.primary[700],
                        }}
                        onMouseEnter={(e) => {
                          if (!isActiveView('pdv')) {
                            e.currentTarget.style.backgroundColor = theme.colors.primary[200];
                            e.currentTarget.style.color = theme.colors.primary[800];
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActiveView('pdv')) {
                            e.currentTarget.style.backgroundColor = theme.colors.primary[100];
                            e.currentTarget.style.color = theme.colors.primary[700];
                          }
                        }}
                        title="PDV - Ponto de Venda"
                      >
                        <Calculator className="w-4 h-4" />
                        <span>PDV</span>
                      </button>
                      <button
                        onClick={() => onViewChange('admin')}
                        className="p-2.5 rounded-full transition-all"
                        style={{
                          backgroundColor: isActiveView('admin') ? theme.colors.primary[200] : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActiveView('admin')) e.currentTarget.style.backgroundColor = theme.colors.primary[100];
                        }}
                        onMouseLeave={(e) => {
                          if (!isActiveView('admin')) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title="Painel Administrativo"
                      >
                        <LayoutDashboard className="w-5 h-5" style={{ color: theme.colors.primary[600] }} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onViewChange('profile')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-all font-medium text-sm"
                    style={{
                      backgroundColor: isActiveView('profile') ? theme.colors.primary[600] : theme.colors.primary[100],
                      color: isActiveView('profile') ? 'white' : theme.colors.primary[700],
                    }}
                    onMouseEnter={(e) => {
                      if (!isActiveView('profile')) {
                        e.currentTarget.style.backgroundColor = theme.colors.primary[200];
                        e.currentTarget.style.color = theme.colors.primary[800];
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActiveView('profile')) {
                        e.currentTarget.style.backgroundColor = theme.colors.primary[100];
                        e.currentTarget.style.color = theme.colors.primary[700];
                      }
                    }}
                  >
                    <User className="w-4 h-4" />
                    <span>{user.name.split(' ')[0]}</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="p-2.5 rounded-full transition-all"
                    style={{ color: theme.colors.neutral[400] }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.error + '15';
                      e.currentTarget.style.color = theme.colors.error;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = theme.colors.neutral[400];
                    }}
                    title="Sair"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 pl-5 border-l" style={{ borderColor: theme.colors.primary[200] }}>
                  <button
                    onClick={() => onViewChange('login')}
                    className="px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                    style={{
                      color: theme.colors.primary[700],
                      backgroundColor: isActiveView('login') || isActiveView('register') ? theme.colors.primary[200] : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.primary[100];
                    }}
                    onMouseLeave={(e) => {
                      if (!isActiveView('login') && !isActiveView('register')) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => onViewChange('register')}
                    className="px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all hover:scale-105 shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
                      boxShadow: theme.shadows.pink,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = theme.shadows.pinkLg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = theme.shadows.pink;
                    }}
                  >
                    Criar conta
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center gap-2">
              <button
                onClick={() => onViewChange('cart')}
                className="p-2.5 rounded-full relative"
                style={{ backgroundColor: theme.colors.primary[100] }}
              >
                <ShoppingCart className="w-5 h-5" style={{ color: theme.colors.primary[600] }} />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 text-white text-xs font-bold w-4 h-4 flex items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.colors.primary[500] }}
                  >
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2.5 rounded-lg"
                style={{ color: theme.colors.neutral[600] }}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden" style={{ backgroundColor: 'white', borderTop: `1px solid ${theme.colors.primary[200]}` }}>
            <div className="px-4 py-4 space-y-1">
              {/* Mobile Search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  className="w-full pl-11 pr-4 py-3 rounded-full text-sm"
                  style={{
                    backgroundColor: theme.colors.primary[50],
                    border: `2px solid ${theme.colors.primary[200]}`,
                  }}
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: theme.colors.primary[400] }} />
              </div>

              <button
                onClick={() => { onViewChange('store'); setIsMenuOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium transition-all"
                style={{ color: theme.colors.neutral[700] }}
              >
                <Store className="w-5 h-5" style={{ color: theme.colors.primary[500] }} />
                <span>Início</span>
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { onViewChange('store'); setIsMenuOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all pl-12"
                  style={{ color: theme.colors.neutral[600] }}
                >
                  <span>{cat.name}</span>
                </button>
              ))}

              <hr className="my-2" style={{ borderColor: theme.colors.primary[200] }} />

              {user ? (
                <>
                  <button
                    onClick={() => { onViewChange('profile'); setIsMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium"
                    style={{ color: theme.colors.neutral[700] }}
                  >
                    <User className="w-5 h-5" style={{ color: theme.colors.primary[500] }} />
                    <span>Minha Conta</span>
                  </button>
                  {(user.role === 'admin' || user.role === 'employee') && (
                    <>
                      <button
                        onClick={() => { onViewChange('pdv'); setIsMenuOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium"
                        style={{ color: theme.colors.neutral[700] }}
                      >
                        <Calculator className="w-5 h-5" style={{ color: theme.colors.primary[500] }} />
                        <span>PDV - Vendas</span>
                      </button>
                      <button
                        onClick={() => { onViewChange('admin'); setIsMenuOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium"
                        style={{ color: theme.colors.neutral[700] }}
                      >
                        <LayoutDashboard className="w-5 h-5" style={{ color: theme.colors.primary[500] }} />
                        <span>Painel Admin</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { onLogout(); setIsMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium"
                    style={{ color: theme.colors.error }}
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sair</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { onViewChange('login'); setIsMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium"
                    style={{ color: theme.colors.neutral[700] }}
                  >
                    <User className="w-5 h-5" style={{ color: theme.colors.primary[500] }} />
                    <span>Entrar</span>
                  </button>
                  <button
                    onClick={() => { onViewChange('register'); setIsMenuOpen(false); }}
                    className="w-full py-3 rounded-xl font-medium text-white mt-2"
                    style={{ background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)` }}
                  >
                    Criar conta
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: theme.colors.neutral[900] }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold mb-4" style={{ color: theme.colors.primary[300] }}>
                {storeName}
              </h3>
              <p className="text-sm leading-relaxed max-w-sm" style={{ color: theme.colors.neutral[400] }}>
                Moda elegante e sofisticada para todas as ocasiões. Encontre as melhores peças com qualidade premium e preço justo.
              </p>
              {storeConfig?.contactEmail && (
                <p className="mt-4 text-sm" style={{ color: theme.colors.neutral[500] }}>
                  {storeConfig.contactEmail}
                </p>
              )}
              {storeConfig?.contactPhone && (
                <p className="text-sm" style={{ color: theme.colors.neutral[500] }}>
                  {storeConfig.contactPhone}
                </p>
              )}
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-semibold mb-6 uppercase text-sm tracking-wider">Navegação</h4>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => onViewChange('store')} className="text-sm transition-colors hover:text-white" style={{ color: theme.colors.neutral[400] }}>
                    Início
                  </button>
                </li>
                <li>
                  <button onClick={() => onViewChange(user ? 'profile' : 'login')} className="text-sm transition-colors hover:text-white" style={{ color: theme.colors.neutral[400] }}>
                    Minha Conta
                  </button>
                </li>
                <li>
                  <button onClick={() => onViewChange('cart')} className="text-sm transition-colors hover:text-white" style={{ color: theme.colors.neutral[400] }}>
                    Carrinho
                  </button>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold mb-6 uppercase text-sm tracking-wider">Legal</h4>
              <ul className="space-y-3">
                <li><span className="text-sm transition-colors hover:text-white cursor-pointer" style={{ color: theme.colors.neutral[400] }}>Termos de Uso</span></li>
                <li><span className="text-sm transition-colors hover:text-white cursor-pointer" style={{ color: theme.colors.neutral[400] }}>Política de Privacidade</span></li>
                <li><span className="text-sm transition-colors hover:text-white cursor-pointer" style={{ color: theme.colors.neutral[400] }}>Trocas e Devoluções</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 text-center" style={{ borderTop: `1px solid ${theme.colors.neutral[800]}` }}>
            <p className="text-sm" style={{ color: theme.colors.neutral[500] }}>
              © {new Date().getFullYear()} {storeName}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
