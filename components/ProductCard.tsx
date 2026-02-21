import React, { useState } from 'react';
import type { Product, CartItem } from '../types';
import { ShoppingBag, Plus, X } from 'lucide-react';
import { theme } from '../theme';

interface ProductCardProps {
  product: Product;
  onAddToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  onClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, onClick }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes.length > 0 ? product.sizes[0] : undefined
  );
  const [selectedColor, setSelectedColor] = useState(product.colors.length > 0 ? product.colors[0] : undefined);

  const price = product.promotionalPrice || product.price;
  const hasDiscount = product.promotionalPrice && product.promotionalPrice < product.price;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden cursor-pointer" onClick={onClick}>
        <img
          src={product.images[0] || '/placeholder-product.jpg'}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Discount Badge */}
        {hasDiscount && (
          <div
            className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: theme.colors.error, color: 'white' }}
          >
            -{Math.round((1 - product.promotionalPrice! / product.price) * 100)}%
          </div>
        )}

        {/* Quick Add Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowOptions(true);
          }}
          className="absolute bottom-3 right-3 p-3 rounded-full text-white shadow-lg transition-all hover:scale-110"
          style={{ backgroundColor: theme.colors.primary[500] }}
        >
          <ShoppingBag className="w-5 h-5" />
        </button>
      </div>

      {/* Product Info */}
      <div className="p-4 relative">
        {/* Description Reveal Effect */}
        <div className="absolute inset-0 bg-white/95 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-10 flex flex-col justify-center">
          <p
            className="text-sm leading-relaxed italic opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100"
            style={{ color: theme.colors.neutral[600] }}
          >
            {product.description || 'Nenhuma descrição disponível.'}
          </p>
          <div className="mt-4 w-12 h-0.5 bg-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 delay-300 origin-left" />
        </div>

        <h3
          className="font-semibold text-lg mb-2 cursor-pointer hover:text-pink-600 transition-colors line-clamp-2"
          style={{ color: theme.colors.neutral[800] }}
          onClick={onClick}
        >
          {product.name}
        </h3>

        {/* Price */}
        <div className="mb-3">
          {hasDiscount ? (
            <div className="flex items-center gap-2">
              <span className="text-sm line-through" style={{ color: theme.colors.neutral[400] }}>
                {formatCurrency(product.price)}
              </span>
              <span className="font-bold text-lg" style={{ color: theme.colors.primary[600] }}>
                {formatCurrency(product.promotionalPrice!)}
              </span>
            </div>
          ) : (
            <span className="font-bold text-lg" style={{ color: theme.colors.neutral[800] }}>
              {formatCurrency(product.price)}
            </span>
          )}
        </div>

        {/* Size and Color Options */}
        {(product.sizes.length > 0 || product.colors.length > 0) && (
          <div className="space-y-2 mb-3">
            {/* Size Options */}
            {product.sizes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className="px-2 py-1 text-xs rounded border transition-all"
                    style={{
                      backgroundColor: selectedSize === size ? theme.colors.primary[500] : 'transparent',
                      borderColor: theme.colors.primary[300],
                      color: selectedSize === size ? 'white' : theme.colors.primary[700],
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}

            {/* Color Options */}
            {product.colors.length > 0 && (
              <div className="flex gap-1">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color)}
                    className="w-6 h-6 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: color.hex,
                      borderColor: selectedColor?.name === color.name ? theme.colors.primary[500] : theme.colors.primary[200],
                      transform: selectedColor?.name === color.name ? 'scale(1.2)' : 'scale(1)',
                    }}
                    title={color.name}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stock Status */}
        <div className="text-sm" style={{ color: theme.colors.success }}>
          Em estoque
        </div>
      </div>

      {/* Add to Cart Modal */}
      {showOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: theme.shadows.pinkLg }}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold" style={{ color: theme.colors.neutral[800] }}>
                Adicionar ao Carrinho
              </h3>
              <button
                onClick={() => setShowOptions(false)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: theme.colors.neutral[400] }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-4 mb-4">
              <img
                src={product.images[0] || '/placeholder-product.jpg'}
                alt={product.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h4 className="font-semibold mb-1" style={{ color: theme.colors.neutral[800] }}>
                  {product.name}
                </h4>
                <div className="font-bold" style={{ color: theme.colors.primary[600] }}>
                  {formatCurrency(price)}
                </div>
              </div>
            </div>

            {/* Size Selection */}
            {product.sizes.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.neutral[700] }}>
                  Tamanho
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className="px-4 py-2 rounded-lg border transition-all"
                      style={{
                        backgroundColor: selectedSize === size ? theme.colors.primary[500] : 'transparent',
                        borderColor: theme.colors.primary[300],
                        color: selectedSize === size ? 'white' : theme.colors.primary[700],
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {product.colors.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.neutral[700] }}>
                  Cor
                </label>
                <div className="flex gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all"
                      style={{
                        backgroundColor: selectedColor?.name === color.name ? theme.colors.primary[50] : 'transparent',
                        borderColor: selectedColor?.name === color.name ? theme.colors.primary[500] : theme.colors.primary[200],
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: color.hex, borderColor: theme.colors.primary[200] }}
                      />
                      <span className="text-sm" style={{ color: theme.colors.neutral[700] }}>
                        {color.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowOptions(false)}
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: theme.colors.neutral[100],
                  color: theme.colors.neutral[700]
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddToCart}
                className="flex-1 px-4 py-3 rounded-lg font-medium text-white transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: theme.colors.primary[500],
                  boxShadow: theme.shadows.pink
                }}
              >
                <Plus className="w-5 h-5" />
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
