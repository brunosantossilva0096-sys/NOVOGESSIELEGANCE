import { useState } from 'react';

export default function PaymentForm() {
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState('BOLETO');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    amount: '',
    cpf: '',
    phone: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Redireciona diretamente para o link de pagamento ASAAS
      window.open('https://www.asaas.com/c/siak23mklgcai3yb', '_blank');
      alert('Redirecionando para página de pagamento ASAAS...');
      
      setFormData({ name: '', email: '', amount: '', cpf: '', phone: '' });
    } catch (error) {
      alert('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '50px auto' }}>
      <h1>Pagamento</h1>

      <div style={{ marginBottom: '20px' }}>
        <label>Tipo de Pagamento:</label>
        <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
          <option value="BOLETO">Boleto</option>
          <option value="PIX">PIX</option>
          <option value="CREDIT_CARD">Cartão de Crédito</option>
        </select>
      </div>

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

        <input
          type="number"
          name="cpf"
          placeholder="CPF"
          value={formData.cpf}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />

        <input
          type="tel"
          name="phone"
          placeholder="Telefone"
          value={formData.phone}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />

        <input
          type="number"
          name="amount"
          placeholder="Valor"
          value={formData.amount}
          onChange={handleChange}
          step="0.01"
          required
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />

        {paymentType === 'CREDIT_CARD' && (
          <>
            <input
              type="text"
              name="cardNumber"
              placeholder="Número do Cartão"
              value={formData.cardNumber}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            />

            <input
              type="text"
              name="expiryMonth"
              placeholder="MM"
              value={formData.expiryMonth}
              onChange={handleChange}
              maxLength="2"
              style={{ width: '48%', padding: '8px', marginBottom: '10px', marginRight: '4%' }}
            />

            <input
              type="text"
              name="expiryYear"
              placeholder="YYYY"
              value={formData.expiryYear}
              onChange={handleChange}
              maxLength="4"
              style={{ width: '48%', padding: '8px', marginBottom: '10px' }}
            />

            <input
              type="text"
              name="cvv"
              placeholder="CVV"
              value={formData.cvv}
              onChange={handleChange}
              maxLength="3"
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            />
          </>
        )}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px' }}>
          {loading ? 'Processando...' : 'Pagar'}
        </button>
      </form>
    </div>
  );
}
