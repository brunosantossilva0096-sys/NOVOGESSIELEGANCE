import React, { useState, useEffect, createContext, useContext } from 'react';
import { Layout } from './components/Layout';
import { Storefront } from './components/Storefront';
import { AdminDashboard } from './components/AdminDashboard';
import { Checkout } from './components/Checkout';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ForgotPassword } from './components/ForgotPassword';
import { UserProfile } from './components/UserProfile';
import { Cart } from './components/Cart';
import { PDV } from './components/PDV';
import OrderTracking from './components/OrderTracking';
import { db, auth, cartService, initializeServices } from './services';
import type { CartItem, Product, User, Category, StoreConfig } from './types';
import { Loader2 } from 'lucide-react';

// Context Types
interface AppContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  cart: CartItem[];
  cartCount: number;
  categories: Category[];
  storeConfig: StoreConfig | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  register: (data: { name: string; email: string; password: string; cpf?: string; phone?: string }) => Promise<{ success: boolean; message?: string }>;
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeFromCart: (productId: string, size?: string, colorName?: string) => void;
  updateCartQuantity: (productId: string, quantity: number, size?: string, colorName?: string) => void;
  clearCart: () => void;
  refreshUser: () => void;
}

// Create Context
const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

// View types
type ViewType = 'store' | 'admin' | 'profile' | 'cart' | 'checkout' | 'login' | 'register' | 'forgot-password' | 'pdv' | 'order-tracking';

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('store');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

  // Initialize services
  useEffect(() => {
    const init = async () => {
      try {
        await initializeServices();

        // Check for existing session
        const currentUser = auth.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          cartService.init(currentUser.id);
          cartService.mergeCarts(currentUser.id);
        } else {
          cartService.init();
        }

        setCart(cartService.getItems());

        // Load categories
        const cats = await db.getActiveCategories();
        setCategories(cats);

        // Load store config
        const config = await db.getStoreConfig();
        setStoreConfig(config);

      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Auth functions
  const login = async (email: string, password: string) => {
    const result = await auth.login({ email, password });
    if (result.success && result.user) {
      setUser(result.user);
      cartService.init(result.user.id);
      cartService.mergeCarts(result.user.id);
      setCart(cartService.getItems());
      return { success: true, message: result.message };
    }
    return { success: false, message: result.message };
  };

  const logout = () => {
    auth.logout();
    setUser(null);
    cartService.init();
    setCart([]);
    setView('store');
  };

  const register = async (data: { name: string; email: string; password: string; cpf?: string; phone?: string }) => {
    const result = await auth.register(data);
    if (result.success && result.user) {
      setUser(result.user);
      cartService.init(result.user.id);
      cartService.mergeCarts(result.user.id);
      setCart(cartService.getItems());
      return { success: true, message: result.message };
    }
    return { success: false, message: result.message };
  };

  const refreshUser = async () => {
    const currentUser = auth.getCurrentUser();
    if (currentUser) {
      const updated = await db.getUserById(currentUser.id);
      if (updated) {
        const userWithoutPassword = { ...updated, password: undefined };
        setUser(userWithoutPassword);
        localStorage.setItem('auth_user', JSON.stringify(userWithoutPassword));
      }
    }
  };

  // Cart functions
  const addToCart = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    cartService.addItem(item);
    setCart(cartService.getItems());
  };

  const removeFromCart = (productId: string, size?: string, colorName?: string) => {
    cartService.removeItem(productId, size, colorName);
    setCart(cartService.getItems());
  };

  const updateCartQuantity = (productId: string, quantity: number, size?: string, colorName?: string) => {
    cartService.updateQuantity(productId, quantity, size, colorName);
    setCart(cartService.getItems());
  };

  const clearCart = () => {
    cartService.clearCart();
    setCart([]);
  };

  // Navigation helpers
  const goToLogin = () => setView('login');
  const goToRegister = () => setView('register');
  const goToForgotPassword = () => setView('forgot-password');
  const goToStore = () => setView('store');
  const goToCart = () => setView('cart');
  const goToCheckout = () => {
    if (!user) {
      setView('login');
      return;
    }
    if (cart.length === 0) {
      return;
    }
    setView('checkout');
  };
  const goToProfile = () => {
    if (!user) {
      setView('login');
      return;
    }
    setView('profile');
  };

  // Render content based on view
  const renderContent = () => {
    switch (view) {
      case 'login':
        return (
          <Login
            onLogin={login}
            onNavigateToRegister={goToRegister}
            onNavigateToForgotPassword={goToForgotPassword}
            onSuccess={goToStore}
          />
        );

      case 'register':
        return (
          <Register
            onRegister={register}
            onNavigateToLogin={goToLogin}
            onSuccess={goToStore}
          />
        );

      case 'forgot-password':
        return (
          <ForgotPassword
            onNavigateToLogin={goToLogin}
          />
        );

      case 'profile':
        return user ? (
          <UserProfile
            user={user}
            onUpdate={refreshUser}
            onNavigateToStore={goToStore}
          />
        ) : (
          <Login
            onLogin={login}
            onNavigateToRegister={goToRegister}
            onNavigateToForgotPassword={goToForgotPassword}
            onSuccess={goToProfile}
          />
        );

      case 'admin':
        return user?.role === 'admin' || user?.role === 'employee' ? (
          <AdminDashboard
            storeConfig={storeConfig}
            onConfigUpdate={setStoreConfig}
          />
        ) : (
          <Storefront
            onAddToCart={addToCart}
          />
        );

      case 'pdv':
        console.log('Rendering PDV view, user:', user?.role);
        return user?.role === 'admin' || user?.role === 'employee' ? (
          <PDV onClose={() => setView('store')} />
        ) : (
          <Storefront
            onAddToCart={addToCart}
          />
        );

      case 'cart':
        return (
          <Cart
            items={cart}
            onUpdateQuantity={updateCartQuantity}
            onRemove={removeFromCart}
            onCheckout={goToCheckout}
            onContinueShopping={goToStore}
          />
        );

      case 'checkout':
        return user && cart.length > 0 ? (
          <Checkout
            user={user}
            cart={cart}
            storeConfig={storeConfig}
            onSuccess={() => {
              clearCart();
              setView('store');
            }}
            onBack={goToCart}
          />
        ) : (
          <Cart
            items={cart}
            onUpdateQuantity={updateCartQuantity}
            onRemove={removeFromCart}
            onCheckout={goToCheckout}
            onContinueShopping={goToStore}
          />
        );

      case 'order-tracking':
        return (
          <OrderTracking
            orderId={''} // Order ID will be passed via URL params in a real implementation
            onBack={() => setView('store')}
          />
        );

      case 'store':
      default:
        return (
          <Storefront
            categories={categories}
            onAddToCart={addToCart}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const contextValue: AppContextType = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isEmployee: user?.role === 'admin' || user?.role === 'employee',
    cart,
    cartCount: cartService.getItemCount(),
    categories,
    storeConfig,
    login,
    logout,
    register,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    refreshUser,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <Layout
        user={user}
        cartCount={cart.length}
        categories={categories}
        storeConfig={storeConfig}
        onLogout={logout}
        onViewChange={setView}
        currentView={view}
      >
        {renderContent()}
      </Layout>
    </AppContext.Provider>
  );
};

export default App;
