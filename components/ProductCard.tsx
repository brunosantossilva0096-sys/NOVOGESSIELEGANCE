import React, { useState } from 'react';
import type { Product, CartItem } from '../types';
import { ShoppingBag, Plus, X, Info } from 'lucide-react';
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
            className="group rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-pinkLg h-full flex flex-col bg-white"
            style={{
                border: `1px solid ${theme.colors.primary[100]}`
            }}
        >
            {/* Visual Section: Image with Luxury Zoom */}
            <div className="relative aspect-[4/5] overflow-hidden cursor-pointer bg-neutral-50" onClick={onClick}>
                <img
                    src={product.images[0] || '/placeholder-product.jpg'}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Discount Badge - Top Left */}
                {hasDiscount && (
                    <div
                        className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-lg animate-in fade-in zoom-in"
                        style={{ backgroundColor: theme.colors.error, color: 'white' }}
                    >
                        -{Math.round((1 - product.promotionalPrice! / product.price) * 100)}%
                    </div>
                )}

                {/* Quick Details Floating Button - Top Right */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick?.();
                    }}
                    className="absolute top-4 right-4 p-2.5 bg-white/80 backdrop-blur-md rounded-full shadow-md opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 hover:bg-white"
                >
                    <Info className="w-4 h-4 text-neutral-600" />
                </button>
            </div>

            {/* Info Section: Intelligent Expansion */}
            <div className="p-5 flex-1 flex flex-col">
                {/* Header: Name and Price (Always Visible) */}
                <div className="flex justify-between items-start gap-2 mb-2">
                    <h3
                        className="font-bold text-lg text-neutral-800 group-hover:text-pink-600 transition-colors cursor-pointer"
                        onClick={onClick}
                    >
                        {product.name}
                    </h3>
                    <div className="text-right flex-shrink-0">
                        {hasDiscount ? (
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] line-through text-neutral-400" style={{ textDecorationColor: theme.colors.error }}>
                                    {formatCurrency(product.price)}
                                </span>
                                <span className="font-bold text-base" style={{ color: theme.colors.primary[600] }}>
                                    {formatCurrency(product.promotionalPrice!)}
                                </span>
                            </div>
                        ) : (
                            <span className="font-bold text-base text-neutral-800">
                                {formatCurrency(product.price)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Status indicator (Visible by default, fades on hover) */}
                <div className="flex items-center gap-1.5 mb-2 group-hover:opacity-0 transition-opacity">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-green-600">Disponível</span>
                </div>

                {/* Expansion Area: Description revealed via grid-template-rows */}
                <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-out overflow-hidden">
                    <div className="min-h-0">
                        <p className="text-xs text-neutral-500 leading-relaxed italic border-t border-neutral-50 pt-3 pb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100">
                            {product.description || 'Uma peça exclusiva desenhada para realçar sua essência e sofisticação.'}
                        </p>
                    </div>
                </div>

                {/* Main Action: Add to Cart Button (LOGO NA FRENTE) */}
                <div className="mt-auto pt-4">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowOptions(true);
                        }}
                        className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-pink transform group-hover:scale-[1.02] transition-all duration-300"
                        style={{ background: theme.gradients.button }}
                    >
                        <ShoppingBag className="w-5 h-5" />
                        Adicionar ao Carrinho
                    </button>

                    {/* Sizes preview (Small hint below button on hover) */}
                    <div className="mt-2 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 h-4">
                        {product.sizes.slice(0, 4).map(s => (
                            <span key={s} className="text-[9px] font-bold text-neutral-300 uppercase">{s}</span>
                        ))}
                        {product.sizes.length > 4 && <span className="text-[9px] text-neutral-300">...</span>}
                    </div>
                </div>
            </div>

            {/* Boutique Style Options Modal */}
            {showOptions && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-500 border border-white/20">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-bold text-neutral-900 mb-1">Escolha o seu</h3>
                                <p className="text-xs text-neutral-400 uppercase tracking-widest font-medium">Boutique Selection</p>
                            </div>
                            <button onClick={() => setShowOptions(false)} className="p-2 hover:bg-neutral-50 rounded-full transition-colors">
                                <X className="w-6 h-6 text-neutral-300" />
                            </button>
                        </div>

                        <div className="flex gap-6 mb-10 items-center">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg border-2 border-primary-50">
                                <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-neutral-800 mb-1 leading-tight">{product.name}</h4>
                                <p className="text-xl font-bold" style={{ color: theme.colors.primary[600] }}>{formatCurrency(price)}</p>
                                <p className="text-[10px] text-neutral-400 font-medium">ou 3x de {formatCurrency(price / 3)} sem juros</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {product.sizes.length > 0 && (
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-4">Tamanhos Disponíveis</label>
                                    <div className="flex flex-wrap gap-2.5">
                                        {product.sizes.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setSelectedSize(s)}
                                                className={`min-w-[48px] h-[48px] rounded-xl text-sm font-bold transition-all border-2 ${selectedSize === s
                                                    ? 'bg-neutral-900 border-neutral-900 text-white shadow-lg scale-105'
                                                    : 'bg-white border-neutral-100 text-neutral-500 hover:border-pink-200'
                                                    }`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {product.colors.length > 0 && (
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-4">Cores</label>
                                    <div className="flex gap-4">
                                        {product.colors.map(c => (
                                            <button
                                                key={c.name}
                                                onClick={() => setSelectedColor(c)}
                                                className={`group p-1 rounded-full border-2 transition-all ${selectedColor?.name === c.name ? 'border-pink-400 scale-125' : 'border-transparent'}`}
                                                title={c.name}
                                            >
                                                <div className="w-8 h-8 rounded-full shadow-inner border border-black/5" style={{ backgroundColor: c.hex }} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleAddToCart}
                            className="w-full mt-10 py-5 rounded-2xl text-white font-bold text-lg shadow-pink transition-all hover:scale-[1.02] flex items-center justify-center gap-3 active:scale-95"
                            style={{ background: theme.gradients.button }}
                        >
                            <ShoppingBag className="w-6 h-6" /> Adicionar ao Carrinho
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
