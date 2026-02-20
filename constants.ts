
import { Product, Category } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Camiseta Minimalist Algodão Egípcio',
    description: 'Toque suave, durabilidade extrema e caimento perfeito. Ideal para o dia a dia elegante.',
    price: 129.90,
    category: 'Masculino',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=600',
    stock: 45
  },
  {
    id: '2',
    name: 'Vestido Midi Floral Primavera',
    description: 'Leveza e elegância em um design exclusivo. Tecido respirável de alta qualidade.',
    price: 289.00,
    category: 'Feminino',
    image: 'https://images.unsplash.com/photo-1572804013307-a9a111dc822d?auto=format&fit=crop&q=80&w=600',
    stock: 12
  },
  {
    id: '3',
    name: 'Jaqueta Bomber Couro Ecológico',
    description: 'Estilo urbano com consciência. Resistente ao vento e com forro térmico.',
    price: 459.90,
    category: 'Inverno',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=600',
    stock: 8
  },
  {
    id: '4',
    name: 'Calça Jeans Premium Slim Fit',
    description: 'Lavagem artesanal e tecnologia stretch que garante conforto total sem perder a forma.',
    price: 199.00,
    category: 'Masculino',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=600',
    stock: 30
  },
  {
    id: '5',
    name: 'Blazer Estruturado Modern Business',
    description: 'O toque de sofisticação que faltava no seu closet profissional.',
    price: 380.00,
    category: 'Feminino',
    image: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&q=80&w=600',
    stock: 15
  },
  {
    id: '6',
    name: 'Óculos de Sol Urban Style',
    description: 'Proteção UV400 com lentes polarizadas e armação ultra leve.',
    price: 150.00,
    category: 'Acessórios',
    image: 'https://images.unsplash.com/photo-1511499767390-90342f56771f?auto=format&fit=crop&q=80&w=600',
    stock: 25
  },
  {
    id: '7',
    name: 'Bota Chelsea Couro Legítimo',
    description: 'Clássico atemporal feito à mão para durar décadas.',
    price: 599.00,
    category: 'Calçados',
    image: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&q=80&w=600',
    stock: 10
  }
];

export const CATEGORIES: Category[] = [
  { id: '1', name: 'Masculino' },
  { id: '2', name: 'Feminino' },
  { id: '3', name: 'Inverno' },
  { id: '4', name: 'Acessórios' },
  { id: '5', name: 'Calçados' }
];
