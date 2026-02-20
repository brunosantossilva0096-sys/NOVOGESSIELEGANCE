import React, { useState } from 'react';
import type { Product, CartItem, ShippingQuote } from '../types';
import { ShoppingBag, Plus, X, Truck, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { theme } from '../theme';
import { shippingService } from '../services';

interface ProductCardProps {
  product: Product;
  onAddToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  onClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, onClick }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [showShipping, setShowShipping] = useState(false);
  const [cep, setCep] = useState('');
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuote[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes.length > 0 ? product.sizes[0] : undefined
  );
  const [selectedColor, setSelectedColor] = useState(product.colors.length > 0 ? product.colors[0] : undefined);

  const price = product.promotionalPrice || product.price;
  const hasDiscount = product.promotionalPrice && product.promotionalPrice < product.price;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatCep = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    if (formatted.length <= 9) {
      setCep(formatted);
      setShippingError(null);
    }
  };

  const calculateShipping = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setShippingError('CEP inválido');
      return;
    }

    setIsCalculating(true);
    setShippingError(null);

    try {
      const result = await shippingService.calculateShipping(cleanCep, price);
      if (result.success && result.quotes.length > 0) {
        setShippingQuotes(result.quotes);
      } else {
        setShippingError(result.error || 'Não foi possível calcular o frete');
        setShippingQuotes([]);
      }
    } catch (error) {
      setShippingError('Erro ao calcular frete');
      setShippingQuotes([]);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleAddToCart = () => {
    onAddToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      promotionalPrice: product.promotionalPrice,
      image: product.images[0] || '',
      size: selectedSize,
      color: selectedColor,
      quantity: 1,
    });
    setShowOptions(false);
  };

  return (
    <div 
      className="group rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl"
      style={{ 
        backgroundColor: 'white',
        boxShadow: theme.shadows.sm,
        border: `1px solid ${theme.colors.primary[100]}`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = theme.shadows.pinkLg;
        e.currentTarget.style.borderColor = theme.colors.primary[300];
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = theme.shadows.sm;
        e.currentTarget.style.borderColor = theme.colors.primary[100];
      }}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/5] overflow-hidden" style={{ backgroundColor: theme.colors.primary[50] }}>
        <img
          src={product.images[0]}
          alt={product.name}
          onClick={onClick}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {hasDiscount && (
            <span 
              className="text-white text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: `linear-gradient(135deg, ${theme.colors.error} 0%, #c0392b 100%)` }}
            >
              -{Math.round((1 - product.promotionalPrice! / product.price) * 100)}%
            </span>
          )}
          {product.stock <= 5 && product.stock > 0 && (
            <span 
              className="text-white text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: `linear-gradient(135deg, ${theme.colors.warning} 0%, #d97706 100%)` }}
            >
              Últimas unidades
            </span>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
            <span 
              className="font-bold px-5 py-2.5 rounded-full text-sm"
              style={{ 
                backgroundColor: theme.colors.neutral[800],
                color: 'white'
              }}
            >
              Esgotado
            </span>
          </div>
        )}

        {/* Quick Add Button */}
        {product.stock > 0 && !showOptions && (
          <button
            onClick={() => setShowOptions(true)}
            className="absolute bottom-4 right-4 w-12 h-12 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center hover:scale-110"
            style={{ 
              background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
              boxShadow: theme.shadows.pink
            }}
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <span 
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: theme.colors.primary[600] }}
        >
          {product.category}
        </span>
        <h3
          onClick={onClick}
          className="font-semibold mt-1 mb-2 line-clamp-1 cursor-pointer transition-colors"
          style={{ color: theme.colors.neutral[800] }}
          onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.primary[600]}
          onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.neutral[800]}
        >
          {product.name}
        </h3>

        {/* Price */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl font-bold" style={{ color: theme.colors.primary[600] }}>
            {price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          {hasDiscount && (
            <span className="text-sm line-through" style={{ color: theme.colors.neutral[400] }}>
              {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          )}
        </div>

        {/* Shipping Calculator */}
        <div className="mb-3">
          <button
            onClick={() => setShowShipping(!showShipping)}
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: theme.colors.primary[600] }}
          >
            <Truck className="w-4 h-4" />
            <span>Calcular frete</span>
            {showShipping ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showShipping && (
            <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: theme.colors.primary[50] }}>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: theme.colors.neutral[400] }} />
                  <input
                    type="text"
                    value={cep}
                    onChange={handleCepChange}
                    placeholder="00000-000"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none"
                    style={{ 
                      borderColor: shippingError ? theme.colors.error : theme.colors.primary[200],
                      backgroundColor: 'white',
                      color: theme.colors.neutral[800]
                    }}
                  />
                </div>
                <button
                  onClick={calculateShipping}
                  disabled={isCalculating || cep.length < 8}
                  className="px-3 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap"
                  style={{ 
                    backgroundColor: isCalculating || cep.length < 8 ? theme.colors.neutral[200] : theme.colors.primary[500],
                    color: isCalculating || cep.length < 8 ? theme.colors.neutral[500] : 'white'
                  }}
                >
                  {isCalculating ? '...' : 'OK'}
                </button>
              </div>
              {shippingError && (
                <p className="text-xs mb-2" style={{ color: theme.colors.error }}>{shippingError}</p>
              )}

              {shippingQuotes.length > 0 && (
                <div className="space-y-1">
                  {shippingQuotes.slice(0, 3).map((quote) => (
                    <div
                      key={quote.method.id}
                      className="flex justify-between items-center py-1.5 px-2 rounded"
                      style={{ backgroundColor: 'white' }}
                    >
                      <div>
                        <span className="text-sm font-medium" style={{ color: theme.colors.neutral[700] }}>
                          {quote.method.name}
                        </span>
                        <p className="text-xs" style={{ color: theme.colors.neutral[500] }}>
                          {quote.estimatedDays}
                        </p>
                      </div>
                      <span className="font-bold text-sm" style={{ color: theme.colors.primary[600] }}>
                        {quote.cost === 0 ? 'Grátis' : formatCurrency(quote.cost)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Size Options */}
        {showOptions && product.sizes.length > 0 && (
          <div className="mb-3">
            <p className="text-xs mb-2" style={{ color: theme.colors.neutral[500] }}>
              Tamanho: <span className="font-medium" style={{ color: theme.colors.neutral[800] }}>{selectedSize}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className="w-10 h-10 text-sm font-medium rounded-lg border transition-all"
                  style={{ 
                    backgroundColor: selectedSize === size ? theme.colors.primary[600] : 'white',
                    color: selectedSize === size ? 'white' : theme.colors.neutral[700],
                    borderColor: selectedSize === size ? theme.colors.primary[600] : theme.colors.primary[200]
                  }}
                  onMouseEnter={(e) => {
                    if (selectedSize !== size) e.currentTarget.style.borderColor = theme.colors.primary[400];
                  }}
                  onMouseLeave={(e) => {
                    if (selectedSize !== size) e.currentTarget.style.borderColor = theme.colors.primary[200];
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color Options */}
        {showOptions && product.colors.length > 0 && (
          <div className="mb-3">
            <p className="text-xs mb-2" style={{ color: theme.colors.neutral[500] }}>
              Cor: <span className="font-medium" style={{ color: theme.colors.neutral[800] }}>{selectedColor?.name}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {product.colors.map(color => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color)}
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{ 
                    backgroundColor: color.hex,
                    borderColor: selectedColor?.name === color.name ? theme.colors.primary[600] : theme.colors.primary[200],
                    boxShadow: selectedColor?.name === color.name ? `0 0 0 3px ${theme.colors.primary[100]}` : 'none'
                  }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showOptions ? (
          <div className="flex gap-2">
            <button
              onClick={handleAddToCart}
              className="flex-1 text-white py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              style={{ 
                background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
                boxShadow: theme.shadows.pink
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = theme.shadows.pinkLg;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = theme.shadows.pink;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <ShoppingBag className="w-4 h-4" />
              Adicionar
            </button>
            <button
              onClick={() => setShowOptions(false)}
              className="w-12 h-12 border rounded-xl flex items-center justify-center transition-all"
              style={{ 
                borderColor: theme.colors.primary[200],
                color: theme.colors.neutral[400]
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = theme.colors.primary[400];
                e.currentTarget.style.color = theme.colors.neutral[600];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = theme.colors.primary[200];
                e.currentTarget.style.color = theme.colors.neutral[400];
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            disabled={product.stock === 0}
            onClick={() => product.stock > 0 && setShowOptions(true)}
            className="w-full py-3 rounded-xl font-semibold transition-all"
            style={{
              backgroundColor: product.stock === 0 ? theme.colors.neutral[100] : theme.colors.neutral[900],
              color: product.stock === 0 ? theme.colors.neutral[400] : 'white',
              cursor: product.stock === 0 ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (product.stock > 0) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {product.stock === 0 ? 'Esgotado' : 'Adicionar ao Carrinho'}
          </button>
        )}
      </div>
    </div>
  );
};
