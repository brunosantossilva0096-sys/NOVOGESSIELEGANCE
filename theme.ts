// Paleta de Cores - Gessi Elegance
// Tons de Rosa Elegante inspirados na paleta Afeto Design

export const theme = {
  // Cores Principais
  colors: {
    // Primária - Rosa elegante (do mais claro ao mais escuro)
    primary: {
      50: '#FDF5F5',
      100: '#FAE8E8',
      200: '#F5D4D4',
      300: '#E8CECD', // Principal mais claro
      400: '#DCAFAC', // Principal médio
      500: '#CDA09B', // Principal (cor base)
      600: '#AA7F79', // Principal mais escuro
      700: '#8B6A65',
      800: '#6D524E',
      900: '#4F3C39',
    },
    // Secundária - Dourado/Bege para complementar
    secondary: {
      50: '#FDFBF7',
      100: '#FAF4E8',
      200: '#F5E8D4',
      300: '#E8D9B8',
      400: '#D4C4A0',
      500: '#C4B090',
      600: '#A89575',
      700: '#8B7A5F',
      800: '#6D6048',
      900: '#4F4635',
    },
    // Tons de cinza elegantes
    neutral: {
      50: '#FAFAFA',
      100: '#F5F0F0',
      200: '#E8E0E0',
      300: '#D4C8C8',
      400: '#B0A0A0',
      500: '#8B7A7A',
      600: '#6D5C5C',
      700: '#4F4242',
      800: '#332A2A',
      900: '#1A1414',
    },
    // Cores de estado
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Gradientes elegantes
  gradients: {
    hero: 'linear-gradient(135deg, #E8CECD 0%, #DCAFAC 50%, #AA7F79 100%)',
    card: 'linear-gradient(180deg, #FFFFFF 0%, #FAF4F4 100%)',
    button: 'linear-gradient(135deg, #DCAFAC 0%, #CDA09B 100%)',
    buttonHover: 'linear-gradient(135deg, #CDA09B 0%, #AA7F79 100%)',
    soft: 'linear-gradient(135deg, #FDF5F5 0%, #FAE8E8 100%)',
  },

  // Sombras elegantes
  shadows: {
    sm: '0 1px 2px 0 rgba(170, 127, 121, 0.05)',
    md: '0 4px 6px -1px rgba(170, 127, 121, 0.1), 0 2px 4px -1px rgba(170, 127, 121, 0.06)',
    lg: '0 10px 15px -3px rgba(170, 127, 121, 0.1), 0 4px 6px -2px rgba(170, 127, 121, 0.05)',
    xl: '0 20px 25px -5px rgba(170, 127, 121, 0.1), 0 10px 10px -5px rgba(170, 127, 121, 0.04)',
    pink: '0 4px 14px 0 rgba(205, 160, 155, 0.39)',
    pinkLg: '0 10px 30px rgba(205, 160, 155, 0.3)',
  },

  // Bordas arredondadas
  borderRadius: {
    none: '0',
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    '3xl': '2rem',    // 32px
    full: '9999px',
  },

  // Animações
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

// Cores CSS para uso inline
export const cssColors = {
  primary: '#CDA09B',
  primaryLight: '#E8CECD',
  primaryMedium: '#DCAFAC',
  primaryDark: '#AA7F79',
  secondary: '#C4B090',
  background: '#FDF5F5',
  text: '#4F4242',
  textLight: '#8B7A7A',
};
