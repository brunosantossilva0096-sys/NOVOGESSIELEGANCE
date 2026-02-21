import React, { useState, useEffect } from 'react';
import { db } from '../services';
import { ProductCard } from './ProductCard';
import { Search, ArrowRight, ShoppingBag, Sparkles, Truck, Shield, Clock, X } from 'lucide-react';
import type { Product, Category } from '../types';
import { theme } from '../theme';

interface StorefrontProps {
  categories: Category[];
  onAddToCart: (item: Omit<import('../types').CartItem, 'quantity'> & { quantity?: number }) => void;
  onProductClick?: (product: Product) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const Storefront: React.FC<StorefrontProps> = ({
  categories,
  onAddToCart,
  onProductClick,
  searchQuery,
  onSearchChange,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [internalSearch, setInternalSearch] = useState('');

  const search = searchQuery !== undefined ? searchQuery : internalSearch;
  const setSearch = onSearchChange || setInternalSearch;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const prods = await db.getActiveProducts();
      setProducts(prods);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const searchLower = search.toLowerCase().trim();
    if (!searchLower) {
      const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
      return matchesCategory;
    }

    const searchTerms = searchLower.split(/\s+/);
    const productData = `${p.name} ${p.description} ${p.tags.join(' ')} ${p.category || ''}`.toLowerCase();

    const matchesSearch = searchTerms.every(term => productData.includes(term));
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const featuredProducts = products.slice(0, 4);

  return (
    <div className="animate-in fade-in duration-500" style={{ backgroundColor: theme.colors.primary[50] }}>
      {/* Hero Section - Design Elegante Rosa */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.colors.primary[300]} 0%, ${theme.colors.primary[400]} 50%, ${theme.colors.primary[500]} 100%)` }}>
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{ background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=1600"
            className="w-full h-full object-cover opacity-20 mix-blend-overlay"
            alt="Fashion"
          />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${theme.colors.primary[600]}90, transparent)` }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-2xl">
            <span
              className="inline-block px-5 py-2 rounded-full text-sm font-semibold mb-6 backdrop-blur-sm"
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)'
              }}
            >
              ✨ Nova Coleção 2026
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Moda Elegante para{' '}
              <span style={{ color: theme.colors.primary[100] }}>Todas as Ocasiões</span>
            </h1>
            <p className="text-lg text-white/90 mb-8 leading-relaxed max-w-lg">
              Descubra peças exclusivas que combinam sofisticação, conforto e qualidade premium. Sua beleza merece o melhor.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 text-white px-8 py-4 rounded-full font-semibold transition-all hover:scale-105 shadow-xl"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.neutral[900]} 0%, ${theme.colors.neutral[800]} 100%)`,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
                }}
              >
                Explorar Coleção <ArrowRight className="w-5 h-5" />
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold transition-all hover:scale-105 backdrop-blur-sm"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                }}
              >
                Ver Novidades
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section style={{ backgroundColor: 'white', borderBottom: `1px solid ${theme.colors.primary[200]}` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.colors.primary[100] }}>
                <Truck className="w-6 h-6" style={{ color: theme.colors.primary[600] }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: theme.colors.neutral[800] }}>Frete FULL</h3>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.colors.secondary[100] }}>
                <Shield className="w-6 h-6" style={{ color: theme.colors.secondary[600] }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: theme.colors.neutral[800] }}>Compra Segura</h3>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fce7f3' }}>
                <Clock className="w-6 h-6" style={{ color: '#be185d' }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: theme.colors.neutral[800] }}>Entrega Rápida</h3>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.colors.primary[100] }}>
                <Sparkles className="w-6 h-6" style={{ color: theme.colors.primary[600] }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: theme.colors.neutral[800] }}>Qualidade Premium</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16" style={{ backgroundColor: theme.colors.primary[50] }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: theme.colors.neutral[800] }}>
                <Sparkles className="w-6 h-6" style={{ color: theme.colors.primary[500] }} />
                Destaques
              </h2>
              <button
                className="text-sm font-medium flex items-center gap-1 transition-all hover:gap-2"
                style={{ color: theme.colors.primary[600] }}
                onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Ver todos <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={onAddToCart}
                  onClick={() => setSelectedProductDetails(product)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Catalog */}
      <section id="catalog" className="py-16" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: theme.colors.neutral[800] }}>Nossos Produtos</h2>
            <p className="max-w-2xl mx-auto" style={{ color: theme.colors.neutral[500] }}>
              Explore nossa coleção exclusiva de moda feminina. Peças cuidadosamente selecionadas para realçar sua beleza.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: theme.colors.primary[400] }} />
              <input
                type="text"
                placeholder="Buscar produtos..."
                className="w-full pl-12 pr-4 py-3 rounded-full focus:outline-none transition-all"
                style={{
                  backgroundColor: theme.colors.primary[50],
                  border: `2px solid ${theme.colors.primary[200]}`,
                  color: theme.colors.neutral[800]
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.primary[500];
                  e.currentTarget.style.boxShadow = theme.shadows.pink;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.primary[200];
                  e.currentTarget.style.boxShadow = 'none';
                }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSelectedCategory(null)}
              className="px-5 py-2.5 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor: !selectedCategory ? theme.colors.primary[600] : 'white',
                color: !selectedCategory ? 'white' : theme.colors.neutral[600],
                border: `2px solid ${!selectedCategory ? theme.colors.primary[600] : theme.colors.primary[200]}`,
                boxShadow: !selectedCategory ? theme.shadows.pink : 'none'
              }}
              onMouseEnter={(e) => {
                if (selectedCategory) {
                  e.currentTarget.style.borderColor = theme.colors.primary[400];
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory) {
                  e.currentTarget.style.borderColor = theme.colors.primary[200];
                }
              }}
            >
              Todas
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: selectedCategory === cat.id ? theme.colors.primary[600] : 'white',
                  color: selectedCategory === cat.id ? 'white' : theme.colors.neutral[600],
                  border: `2px solid ${selectedCategory === cat.id ? theme.colors.primary[600] : theme.colors.primary[200]}`,
                  boxShadow: selectedCategory === cat.id ? theme.shadows.pink : 'none'
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== cat.id) {
                    e.currentTarget.style.borderColor = theme.colors.primary[400];
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== cat.id) {
                    e.currentTarget.style.borderColor = theme.colors.primary[200];
                  }
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.colors.primary[600] }} />
            </div>
          ) : filteredProducts.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <p style={{ color: theme.colors.neutral[500] }}>
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'produto' : 'produtos'} encontrados
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={onAddToCart}
                    onClick={() => setSelectedProductDetails(product)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20 rounded-3xl border-2 border-dashed" style={{ backgroundColor: theme.colors.primary[50], borderColor: theme.colors.primary[200] }}>
              <ShoppingBag className="w-16 h-16 mx-auto mb-4" style={{ color: theme.colors.primary[300] }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: theme.colors.neutral[800] }}>Nenhum produto encontrado</h3>
              <p style={{ color: theme.colors.neutral[500] }}>Tente buscar com outros termos ou categorias.</p>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16" style={{ backgroundColor: theme.colors.neutral[900] }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Receba Novidades e Ofertas</h2>
          <p className="mb-8" style={{ color: theme.colors.neutral[400] }}>Cadastre-se para receber as últimas novidades e promoções exclusivas.</p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Seu e-mail"
              className="flex-1 px-4 py-3 rounded-full focus:outline-none"
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: `1px solid rgba(255,255,255,0.2)`,
                color: 'white'
              }}
            />
            <button
              className="px-6 py-3 rounded-full font-semibold transition-all hover:scale-105 text-white"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
                boxShadow: theme.shadows.pink
              }}
            >
              Cadastrar
            </button>
          </div>
        </div>
      </section>

      {/* Luxury Quick View Modal */}
      {selectedProductDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            onClick={() => setSelectedProductDetails(null)}
          />

          <div className="relative bg-white w-full max-w-5xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in slide-in-from-bottom-8 duration-500 ease-out">
            <button
              onClick={() => setSelectedProductDetails(null)}
              className="absolute top-6 right-6 z-50 p-3 bg-white/80 backdrop-blur rounded-full hover:bg-white transition-colors border border-neutral-100"
            >
              <X className="w-5 h-5 text-neutral-800" />
            </button>

            {/* Visual Column */}
            <div className="w-full md:w-1/2 aspect-square md:aspect-auto h-[300px] md:h-auto overflow-hidden bg-neutral-50 relative group">
              <img
                src={selectedProductDetails.images[0] || '/placeholder-product.jpg'}
                alt={selectedProductDetails.name}
                className="w-full h-full object-cover animate-in zoom-in-110 duration-1000 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </div>

            {/* Content Column - Staggered Reveal */}
            <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center overflow-y-auto max-h-[60vh] md:max-h-none">
              <div className="space-y-8">
                {/* Brand / Category Tag */}
                <div className="animate-in slide-in-from-left-4 fade-in duration-500 delay-100">
                  <span className="text-xs font-bold tracking-[0.2em] uppercase text-pink-500">
                    {categories.find(c => c.id === selectedProductDetails.categoryId)?.name || 'Coleção Elegance'}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-neutral-900 animate-in slide-in-from-left-4 fade-in duration-500 delay-200">
                  {selectedProductDetails.name}
                </h2>

                {/* Price Label */}
                <div className="flex flex-col animate-in slide-in-from-left-4 fade-in duration-500 delay-300">
                  <div className="flex items-baseline gap-4">
                    <span className="text-2xl font-bold text-neutral-900">
                      {(selectedProductDetails.promotionalPrice || selectedProductDetails.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    {selectedProductDetails.promotionalPrice && (
                      <span className="text-lg text-neutral-400 line-through">
                        {selectedProductDetails.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-400 mt-1">ou 3x de {((selectedProductDetails.promotionalPrice || selectedProductDetails.price) / 3).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sem juros</p>
                </div>

                {/* Premium Description Block */}
                <div className="relative animate-in slide-in-from-left-4 fade-in duration-700 delay-400">
                  <div className="absolute -left-6 top-0 bottom-0 w-[1px] bg-neutral-100 hidden lg:block" />
                  <p className="text-lg text-neutral-600 leading-relaxed font-light italic">
                    "{selectedProductDetails.description || 'Uma peça exclusiva desenhada para realçar sua essência e sofisticação.'}"
                  </p>
                </div>

                {/* CTA / Action */}
                <div className="pt-6 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-500">
                  <button
                    onClick={() => {
                      onAddToCart({
                        productId: selectedProductDetails.id,
                        name: selectedProductDetails.name,
                        price: selectedProductDetails.price,
                        promotionalPrice: selectedProductDetails.promotionalPrice,
                        image: selectedProductDetails.images[0] || '',
                        quantity: 1
                      });
                      setSelectedProductDetails(null);
                    }}
                    className="w-full md:w-auto px-12 py-4 bg-neutral-900 text-white rounded-full font-semibold hover:bg-neutral-800 transition-all hover:scale-105 shadow-2xl"
                  >
                    Adicionar ao Carrinho
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
