import { useState } from 'react';

export default function PaymentForm() {
    const [formData, setFormData] = useState({
    name: '',
    email: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Redireciona diretamente para o link de pagamento ASAAS
    window.location.href = 'https://www.asaas.com/c/siak23mklgcai3yb';
  };

  return (
    <div style={{ maxWidth: '500px', margin: '50px auto' }}>
      <h1>Pagamento</h1>

      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Nome"
          value={formData.name}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />

        
        <button type="submit" style={{ width: '100%', padding: '10px' }}>
          Pagar
        </button>
      </form>
    </div>
  );
}
