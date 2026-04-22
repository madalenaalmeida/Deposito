// =========================
// Variáveis globais
// =========================
let currentProduct = null;
let currentPrice = null;
let currentPriceMap = null;
let modalPriceEl = null;
let cart = [];

// Detecta o ramo
const bodyClass = document.body.className || "";
let RAMO_ATUAL = "Geral";
if (bodyClass.includes("ramo-avezinha")) RAMO_ATUAL = "Avezinhas";
else if (bodyClass.includes("ramo-aventura")) RAMO_ATUAL = "Aventura";
else if (bodyClass.includes("ramo-caravela")) RAMO_ATUAL = "Caravela";
else if (bodyClass.includes("ramo-moinho")) RAMO_ATUAL = "Moinho";
else if (bodyClass.includes("dirigentes")) RAMO_ATUAL = "Dirigentes";

// =========================
// Elementos do DOM
// =========================
const modal = document.getElementById('modal');
const modalForm = document.getElementById('order-form'); // 🔴 corrigido
const cartCountSpan = document.getElementById('cart-count');
const checkoutForm = document.getElementById('checkout-form');
const checkoutModal = document.getElementById('checkout-modal');
const checkoutSummaryDiv = document.getElementById('checkout-summary');

// Campos
const tamanhoField = document.getElementById('tamanho');
const quantidadeField = document.getElementById('quantidade');
const especialidadeField = document.getElementById('especialidade');

// =========================
// Helpers
// =========================
const parsePrice = (v) => {
  const n = Number(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

const money = (n) =>
  (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + '€';

function updateCartCount() {
  if (cartCountSpan) cartCountSpan.textContent = cart.length;
}

function resolveUnitPrice(size) {
  if (currentPriceMap && currentPriceMap[size] != null) {
    return parsePrice(currentPriceMap[size]);
  }
  return parsePrice(currentPrice);
}

// =========================
// Abrir modal
// =========================
document.querySelectorAll('.adicionar').forEach(button => {
  button.addEventListener('click', function () {
    currentProduct = this.dataset.produto || '';
    currentPrice = this.dataset.preco ?? null;

    modal.style.display = 'block';
  });
});

// =========================
// Adicionar ao carrinho
// =========================
modalForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  const size = tamanhoField?.value || '';
  const qty = Number(quantidadeField?.value || 1);
  const espec = especialidadeField?.value || '';

  const unit = resolveUnitPrice(size || 'Único');

  cart.push({
    branch: RAMO_ATUAL,
    product: currentProduct,
    price: Number(unit),
    size: size,
    quantity: qty,
    especialidade: espec
  });

  updateCartCount();

  alert(`Adicionado: ${currentProduct} — Qtd: ${qty} — ${money(unit)}`);
  modal.style.display = 'none';
});

// =========================
// Checkout resumo
// =========================
function displayCheckoutSummary() {
  checkoutSummaryDiv.innerHTML = '';
  let total = 0;

  cart.forEach(item => {
    const line = item.price * item.quantity;
    total += line;

    checkoutSummaryDiv.innerHTML += `
      <p>${item.product} — Qtd: ${item.quantity} — ${money(line)}</p>
    `;
  });

  checkoutSummaryDiv.innerHTML += `<hr><strong>Total: ${money(total)}</strong>`;
}

// =========================
// 🔴 ENVIO PARA BACKEND (CORRIGIDO)
// =========================
checkoutForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (cart.length === 0) {
    alert('Carrinho vazio!');
    return;
  }

  const nome = document.getElementById('nome-cliente')?.value.trim();
  const email = document.getElementById('email-cliente')?.value.trim();

  if (!nome || !email) {
    alert('Preenche o nome e o email.');
    return;
  }

  try {
    const respostas = await Promise.all(
      cart.map(async (item) => {

        const payload = {
          nome,
          email,
          ramo: RAMO_ATUAL,
          produto: item.product,
          tamanho: item.size || '',
          quantidade: item.quantity,
          preco_unit: item.price
        };

        const response = await fetch('https://weak-shaylah-madalena-1f0a8947.koyeb.app/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        // 🔴 Tratamento real de erro
        if (!response.ok) {
          const text = await response.text();
          console.error("Erro do servidor:", text);
          return { ok: false };
        }

        return await response.json();
      })
    );

    const falhas = respostas.filter(r => !r || r.ok !== true);

    if (falhas.length > 0) {
      console.error('Falhas:', falhas);
      alert('Alguns itens não foram enviados.');
      return;
    }

    cart = [];
    updateCartCount();
    checkoutModal.style.display = 'none';

    alert('Pedido confirmado com sucesso!');

  } catch (err) {
    console.error('Erro geral:', err);
    alert('Erro a enviar pedido.');
  }
});