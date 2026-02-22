import React, { useState, useEffect } from 'react';
import { Tag, Percent, Clock, Calendar, Loader2, Package } from 'lucide-react';
import { db } from '../services';
import { ProductCard } from './ProductCard';
import type { Product, Category } from '../types';
import type { Promotion } from '../services/database';
import { theme } from '../theme';

interface PromotionsProps {
  onProductSelect: (product: Product) => void;
  onCategorySelect: (category: Category) => void;
  onAddToCart: (item: Omit<import('../types').CartItem, 'quantity'> & { quantity?: number }) => void;
}

export const Promotions: React.FC<PromotionsProps> = ({ onProductSelect, onCategorySelect, onAddToCart }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [promotionalProducts, setPromotionalProducts] = useState<Product[]>([]);
  const [promotionalCategories, setPromotionalCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPromotionalData();
  }, []);

  const loadPromotionalData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [products, categories] = await Promise.all([
        db.getPromotionalProducts(),
        db.getPromotionalCategories()
      ]);

      setPromotionalProducts(products);
      setPromotionalCategories(categories);
    } catch (err) {
      console.error('Error loading promotional data:', err);
      setError('Não foi possível carregar as ofertas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const calculatePromotionalPrice = (product: Product) => {
    return product.promotionalPrice || product.price;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando ofertas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <Tag className="w-12 h-12 mx-auto mb-2" />
          <p>{error}</p>
        </div>
        <button
          onClick={loadPromotionalData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <Percent className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ofertas</h1>
            <p className="text-gray-600">Aproveite nossos melhores preços!</p>
          </div>
        </div>

        {/* Active Promotions Info - Simplified */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-900">Ofertas Especiais</h3>
          </div>
          <p className="text-sm text-green-700 mt-2">
            Produtos com preços especiais!
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'products'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Produtos em Oferta ({promotionalProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'categories'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Categorias em Oferta ({promotionalCategories.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'products' && (
        <div>
          {promotionalProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum produto em oferta no momento
              </h3>
              <p className="text-gray-600">
                Volte em breve para conferir nossas ofertas!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {promotionalProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={onAddToCart}
                  onClick={() => onProductSelect(product)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <div>
          {promotionalCategories.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma categoria em oferta no momento
              </h3>
              <p className="text-gray-600">
                Confira nossos produtos em oferta enquanto aguarda novas ofertas!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {promotionalCategories.map((category) => (
                <div 
                  key={category.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group"
                  onClick={() => onCategorySelect(category)}
                >
                  {/* Category Image */}
                  <div className="relative aspect-video overflow-hidden bg-gray-100">
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Tag className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Promo Badge */}
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      Oferta
                    </div>
                  </div>

                  {/* Category Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-lg mb-2">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
