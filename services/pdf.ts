import type { Order, CartItem } from '../types';

interface ReceiptData {
  order: Order;
  storeName: string;
  storeLogo?: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
}

interface PdfContent {
  html: string;
  css: string;
}

class PdfService {
  // Generate HTML content for the receipt
  generateReceiptHtml(data: ReceiptData): PdfContent {
    const { order, storeName, storeAddress, storePhone, storeEmail } = data;

    const itemsHtml = order.items.map(item => {
      const price = item.promotionalPrice || item.price;
      const subtotal = price * item.quantity;
      return `
        <tr>
          <td class="item-name">
            ${item.name}
            ${item.size ? `<br><small>Tamanho: ${item.size}</small>` : ''}
            ${item.color ? `<br><small>Cor: ${item.color.name}</small>` : ''}
          </td>
          <td class="item-qty">${item.quantity}</td>
          <td class="item-price">${this.formatCurrency(price)}</td>
          <td class="item-subtotal">${this.formatCurrency(subtotal)}</td>
        </tr>
      `;
    }).join('');

    const css = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; line-height: 1.4; color: #333; }
      .receipt { max-width: 800px; margin: 0 auto; padding: 40px; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
      .header h1 { font-size: 24px; margin-bottom: 10px; }
      .header .subtitle { color: #666; font-size: 14px; }
      .section { margin-bottom: 25px; }
      .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; color: #000; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
      .info-grid { display: flex; justify-content: space-between; gap: 40px; }
      .info-block { flex: 1; }
      .info-label { font-weight: bold; margin-bottom: 3px; color: #666; font-size: 10px; text-transform: uppercase; }
      .info-value { font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; }
      th { background: #f5f5f5; padding: 10px; text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 2px solid #000; }
      td { padding: 10px; border-bottom: 1px solid #eee; vertical-align: top; }
      .item-name { width: 50%; }
      .item-qty, .item-price, .item-subtotal { width: 16.66%; text-align: right; }
      .totals { margin-top: 20px; border-top: 2px solid #000; padding-top: 15px; }
      .total-row { display: flex; justify-content: flex-end; gap: 20px; margin-bottom: 5px; }
      .total-label { text-align: right; width: 150px; }
      .total-value { text-align: right; width: 100px; }
      .grand-total { font-size: 16px; font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 2px solid #000; }
      .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
      .status-badge { display: inline-block; padding: 5px 12px; border-radius: 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
      .status-pending { background: #fff3cd; color: #856404; }
      .status-paid { background: #d4edda; color: #155724; }
      .status-shipped { background: #cce5ff; color: #004085; }
      .status-delivered { background: #d1ecf1; color: #0c5460; }
      .status-cancelled { background: #f8d7da; color: #721c24; }
      .payment-method { margin-top: 10px; }
      .qr-section { text-align: center; margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 5px; }
      .qr-code { max-width: 200px; margin: 10px auto; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none; }
        .receipt { padding: 0; }
      }
    `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Comprovante - Pedido ${order.orderNumber}</title>
        <style>${css}</style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>${storeName}</h1>
            ${storeAddress && storeAddress.trim() !== '' ? `<p class="subtitle">${storeAddress}</p>` : ''}
            ${storePhone ? `<p class="subtitle">${storePhone}</p>` : ''}
            ${storeEmail ? `<p class="subtitle">${storeEmail}</p>` : ''}
            <h2 style="margin-top: 20px; font-size: 18px;">COMPROVANTE DE COMPRA</h2>
          </div>

          <div class="section">
            <div class="info-grid">
              <div class="info-block">
                <div class="info-label">Número do Pedido</div>
                <div class="info-value" style="font-size: 16px; font-weight: bold;">${order.orderNumber}</div>
              </div>
              <div class="info-block">
                <div class="info-label">Data do Pedido</div>
                <div class="info-value">${this.formatDate(order.createdAt)}</div>
              </div>
              <div class="info-block">
                <div class="info-label">Status do Pagamento</div>
                <div class="info-value">
                  <span class="status-badge status-${order.paymentStatus.toLowerCase()}">
                    ${this.translateStatus(order.paymentStatus)}
                  </span>
                </div>
              </div>
              <div class="info-block">
                <div class="info-label">Status do Pedido</div>
                <div class="info-value">
                  <span class="status-badge status-${order.status.toLowerCase()}">
                    ${this.translateOrderStatus(order.status)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Dados do Cliente</div>
            <div class="info-grid">
              <div class="info-block">
                <div class="info-label">Nome</div>
                <div class="info-value">${order.userName}</div>
              </div>
              <div class="info-block">
                <div class="info-label">E-mail</div>
                <div class="info-value">${order.userEmail}</div>
              </div>
              ${order.userPhone ? `
              <div class="info-block">
                <div class="info-label">Telefone</div>
                <div class="info-value">${order.userPhone}</div>
              </div>
              ` : ''}
            </div>
          </div>

          ${storeAddress && storeAddress.trim() !== '' ? `
          <div class="section">
            <div class="section-title">Endereço de Entrega</div>
            <div class="info-value">
              ${order.shippingAddress.street}, ${order.shippingAddress.number}
              ${order.shippingAddress.complement ? ` - ${order.shippingAddress.complement}` : ''}<br>
              ${order.shippingAddress.neighborhood}<br>
              ${order.shippingAddress.city} - ${order.shippingAddress.state}<br>
              CEP: ${this.formatCep(order.shippingAddress.zip)}
            </div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Itens do Pedido</div>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th style="text-align: right;">Qtd</th>
                  <th style="text-align: right;">Preço Unit.</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Forma de Pagamento</div>
            <div class="info-value payment-method">
              ${this.translatePaymentMethod(order.paymentMethod)}
              ${order.paymentId ? `<br><small>ID da Transação: ${order.paymentId}</small>` : ''}
            </div>
          </div>

          <div class="totals">
            <div class="total-row">
              <div class="total-label">Subtotal:</div>
              <div class="total-value">${this.formatCurrency(order.subtotal)}</div>
            </div>
            <div class="total-row">
              <div class="total-label">Frete (${order.shippingMethod.name}):</div>
              <div class="total-value">${order.shippingCost === 0 ? 'Grátis' : this.formatCurrency(order.shippingCost)}</div>
            </div>
            ${order.discount > 0 ? `
            <div class="total-row">
              <div class="total-label">Desconto:</div>
              <div class="total-value" style="color: #28a745;">-${this.formatCurrency(order.discount)}</div>
            </div>
            ` : ''}
            <div class="total-row grand-total">
              <div class="total-label">TOTAL:</div>
              <div class="total-value">${this.formatCurrency(order.total)}</div>
            </div>
          </div>

          ${order.paymentQrCode ? `
          <div class="qr-section no-print">
            <div class="section-title">QR Code para Pagamento</div>
            <img src="${order.paymentQrCode}" class="qr-code" alt="QR Code PIX">
            <p style="font-size: 11px; color: #666;">Escaneie o QR code acima para realizar o pagamento via PIX</p>
          </div>
          ` : ''}

          <div class="footer">
            <p>Obrigado por comprar conosco!</p>
            <p style="margin-top: 10px;">Este documento é um comprovante de compra e não possui valor fiscal.</p>
            <p style="margin-top: 5px;">Em caso de dúvidas, entre em contato conosco.</p>
            ${order.paidAt ? `<p style="margin-top: 10px;">Pagamento confirmado em: ${this.formatDate(order.paidAt)}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    return { html, css };
  }

  // Open receipt in new window for printing
  openReceipt(data: ReceiptData): void {
    const { html } = this.generateReceiptHtml(data);
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  }

  // Download receipt as HTML file (can be converted to PDF by browser)
  downloadReceipt(data: ReceiptData, filename?: string): void {
    const { html } = this.generateReceiptHtml(data);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `comprovante-${data.order.orderNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Helper methods
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatCep(cep: string): string {
    return cep.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }

  private translateStatus(status: string): string {
    const translations: Record<string, string> = {
      'PENDING': 'Pendente',
      'CONFIRMED': 'Pago',
      'RECEIVED': 'Pago',
      'OVERDUE': 'Vencido',
      'CANCELLED': 'Cancelado',
      'REFUNDED': 'Estornado',
    };
    return translations[status] || status;
  }

  private translateOrderStatus(status: string): string {
    const translations: Record<string, string> = {
      'PENDING': 'Pendente',
      'PAID': 'Pago',
      'SHIPPED': 'Enviado',
      'DELIVERED': 'Entregue',
      'CANCELLED': 'Cancelado',
      'REFUNDED': 'Estornado',
    };
    return translations[status] || status;
  }

  private translatePaymentMethod(method: string): string {
    const translations: Record<string, string> = {
      'PIX': 'PIX',
      'CREDIT_CARD': 'Cartão de Crédito',
      'DEBIT_CARD': 'Cartão de Débito',
      'BOLETO': 'Boleto Bancário',
      'CASH': 'Dinheiro',
    };
    return translations[method] || method;
  }

  // Generate simplified receipt for email
  generateEmailReceipt(order: Order, storeName: string): string {
    const itemsHtml = order.items.map(item => {
      const price = item.promotionalPrice || item.price;
      const subtotal = price * item.quantity;
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">
            ${item.name}
            ${item.size ? `<br><small>Tamanho: ${item.size}</small>` : ''}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${this.formatCurrency(subtotal)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${storeName} - Comprovante de Compra</h2>
        <p>Olá ${order.userName},</p>
        <p>Seu pedido <strong>${order.orderNumber}</strong> foi recebido!</p>
        
        <h3 style="margin-top: 20px;">Itens do Pedido</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 8px; text-align: left;">Produto</th>
              <th style="padding: 8px; text-align: center;">Qtd</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 5px;">
          <p><strong>Total:</strong> ${this.formatCurrency(order.total)}</p>
          <p><strong>Forma de Pagamento:</strong> ${this.translatePaymentMethod(order.paymentMethod)}</p>
          <p><strong>Status:</strong> ${this.translateOrderStatus(order.status)}</p>
        </div>

        <p style="margin-top: 20px; color: #666;">
          Em caso de dúvidas, entre em contato conosco.<br>
          Obrigado por comprar conosco!
        </p>
      </div>
    `;
  }
}

export const pdfService = new PdfService();
