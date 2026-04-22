// =========================
// Variáveis globais
// =========================
let currentProduct = null;
let currentPrice = null;
let currentPriceMap = null;
let modalPriceEl = null;
let cart = [];

// Detecta o ramo pela classe do <body> (ex.: "ramo-avezinha", "ramo-aventura", etc.)
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
const modalClose = document.getElementById('modal-close');
const modalForm = document.getElementById('modal-form');
const cartCountSpan = document.getElementById('cart-count');
const cartBtn = document.getElementById('cart-btn');
const cartModal = document.getElementById('cart-modal');
const cartModalClose = document.getElementById('cart-modal-close');
const cartItemsDiv = document.getElementById('cart-items');
const confirmCartBtn = document.getElementById('confirm-cart');
const checkoutModal = document.getElementById('checkout-modal');
const checkoutClose = document.getElementById('checkout-close');
const checkoutForm = document.getElementById('checkout-form');
const checkoutSummaryDiv = document.getElementById('checkout-summary');

// Seleciona os campos do modal
const tamanhoField = document.getElementById('tamanho');
const tamanhoLabel = document.getElementById('tamanho-label');
const quantidadeField = document.getElementById('quantidade');
const quantidadeLabel = document.getElementById('quantidade-label');
const especialidadeField = document.getElementById('especialidade');
const especialidadeLabel = document.getElementById('especialidade-label');

// Menu lateral
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
menuBtn?.addEventListener('click', () => {
  sidebar?.classList.toggle('active');
});

// =========================
// Helpers
// =========================
const parsePrice = (v) => {
  if (v == null) return 0;
  const n = Number(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
};
const money = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + '€';

function updateCartCount() {
  if (cartCountSpan) cartCountSpan.textContent = cart.length;
}

function resolveUnitPrice(size) {
  if (currentPriceMap) {
    if (size && currentPriceMap[size] != null) return parsePrice(currentPriceMap[size]);
    if (currentPriceMap['Único'] != null) return parsePrice(currentPriceMap['Único']);
  }
  return parsePrice(currentPrice);
}

function populateSizeOptionsFromMap(map) {
  tamanhoField.innerHTML = '';
  if (!map) return false;
  const keys = Object.keys(map);
  const sizeKeys = keys.filter(k => k !== 'Único');
  if (sizeKeys.length === 0) return false;
  sizeKeys.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = k;
    tamanhoField.appendChild(opt);
  });
  tamanhoField.value = sizeKeys[0];
  return true;
}

// =========================
 // Abrir modal de opções
// =========================
document.querySelectorAll('.adicionar').forEach(button => {
  button.addEventListener('click', function () {
    currentProduct = this.dataset.produto || '';
    currentPrice = this.dataset.preco ?? null;

    // Preços por tamanho (data-precos='{"S":12,"M":13.5,"L":15}')
    currentPriceMap = null;
    if (this.dataset.precos) {
      try {
        const parsed = JSON.parse(this.dataset.precos);
        currentPriceMap = {};
        for (const [k, v] of Object.entries(parsed)) {
          const num = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
          if (!isNaN(num)) currentPriceMap[k] = num;
        }
      } catch (e) {
        console.warn('data-precos inválido para', currentProduct, e);
      }
    }

    // Criar/obter um elemento no modal para mostrar o preço atual
    if (!modalPriceEl) {
      modalPriceEl = document.createElement('div');
      modalPriceEl.id = 'modal-price';
      modalPriceEl.style.margin = '8px 0 12px';
      modalPriceEl.style.fontWeight = '600';
      modalForm.insertBefore(modalPriceEl, modalForm.firstChild?.nextSibling || null);
    }
    const setPriceForSize = (size) => {
      if (currentPriceMap && size && currentPriceMap[size] != null) {
        currentPrice = currentPriceMap[size];
        modalPriceEl.textContent = 'Preço: ' + money(currentPrice);
      } else {
        const base = this.dataset.preco ? parseFloat(this.dataset.preco.replace(',', '.')) : null;
        currentPrice = base;
        modalPriceEl.textContent = base != null ? ('Preço: ' + money(base)) : '';
      }
    };

    // Lê as opções definidas no atributo data-options
    const options = this.dataset.options
      ? this.dataset.options.split(',').map(o => o.trim().toLowerCase())
      : [];

    // Configurar o campo Tamanho
    if (options.includes('tamanho')) {
      const hasSizes = populateSizeOptionsFromMap(currentPriceMap);
      if (hasSizes) {
        tamanhoField.style.display = 'inline-block';
        tamanhoLabel.style.display = 'block';
      } else {
        tamanhoField.style.display = 'none';
        tamanhoLabel.style.display = 'none';
        tamanhoField.value = '';
      }
      tamanhoField.onchange = () => setPriceForSize(tamanhoField.value);
      setPriceForSize(tamanhoField.value);
    } else {
      tamanhoField.style.display = 'none';
      tamanhoLabel.style.display = 'none';
      tamanhoField.value = '';
      setPriceForSize('');
    }

    // Configurar o campo Quantidade
    if (options.includes('quantidade')) {
      quantidadeField.style.display = 'inline-block';
      quantidadeLabel.style.display = 'block';
      quantidadeField.value = 1; // padrão
    } else {
      quantidadeField.style.display = 'none';
      quantidadeLabel.style.display = 'none';
      quantidadeField.value = '';
    }

    // Configurar o campo Especialidade
    if (options.includes('especialidade')) {
      especialidadeField.style.display = 'inline-block';
      especialidadeLabel.style.display = 'block';
      especialidadeField.value = '';
    } else {
      especialidadeField.style.display = 'none';
      especialidadeLabel.style.display = 'none';
      especialidadeField.value = '';
    }

    modal.style.display = 'block';
  });
});

// =========================
// Fechar modais
// =========================
modalClose?.addEventListener('click', () => { modal.style.display = 'none'; });
cartModalClose?.addEventListener('click', () => { cartModal.style.display = 'none'; });
checkoutClose?.addEventListener('click', () => { checkoutModal.style.display = 'none'; });

window.addEventListener('click', (e) => {
  if (e.target === modal) modal.style.display = 'none';
  if (e.target === cartModal) cartModal.style.display = 'none';
  if (e.target === checkoutModal) checkoutModal.style.display = 'none';
});

// =========================
// Adicionar ao carrinho
// =========================
modalForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const size = (tamanhoField.style.display !== 'none' && tamanhoField.value) ? tamanhoField.value : '';
  const qty = (quantidadeField.style.display !== 'none') ? Number(quantidadeField.value || 1) : 1;
  const espec = (especialidadeField.style.display !== 'none') ? (especialidadeField.value || '') : '';

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
  alert(`Adicionado: ${currentProduct}${qty ? ' — Qtd: ' + qty : ''}${size ? ' — Tamanho: ' + size : ''}${espec ? ' — ' + espec : ''} — Unit: ${money(unit)}`);

  modal.style.display = 'none';
});

// =========================
// Carrinho
// =========================
cartBtn?.addEventListener('click', () => {
  displayCartItems();
  cartModal.style.display = 'block';
});

function displayCartItems() {
  cartItemsDiv.innerHTML = '';
  if (cart.length === 0) {
    cartItemsDiv.innerHTML = '<p>Carrinho vazio.</p>';
    return;
  }

  cart.forEach((item, index) => {
    const lineTotal = item.price * (item.quantity || 1);
    const div = document.createElement('div');
    div.classList.add('cart-item');
    div.innerHTML = `<p>${item.product}
      ${item.quantity ? ` — Quantidade: ${item.quantity}` : ''}
      ${item.size ? ` — Tamanho: ${item.size}` : ''}
      ${item.especialidade ? ` — ${item.especialidade}` : ''}
      — Unit: ${money(item.price)} (Total: ${money(lineTotal)})</p>`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remover';
    removeBtn.addEventListener('click', () => {
      cart.splice(index, 1);
      updateCartCount();
      displayCartItems();
    });

    div.appendChild(removeBtn);
    cartItemsDiv.appendChild(div);
  });
}

// =========================
// Checkout
// =========================
confirmCartBtn?.addEventListener('click', () => {
  if (cart.length === 0) { alert('Carrinho vazio!'); return; }
  displayCheckoutSummary();
  cartModal.style.display = 'none';
  checkoutModal.style.display = 'block';
});

function displayCheckoutSummary() {
  checkoutSummaryDiv.innerHTML = '';
  if (cart.length === 0) {
    checkoutSummaryDiv.innerHTML = '<p>Carrinho vazio.</p>';
    return;
  }
  let total = 0;
  cart.forEach(item => {
    const line = item.price * (item.quantity || 1);
    total += line;
    checkoutSummaryDiv.innerHTML += `<p>${item.product}
      ${item.quantity ? ` — Quantidade: ${item.quantity}` : ''}
      ${item.size ? ` — Tamanho: ${item.size}` : ''}
      ${item.especialidade ? ` — ${item.especialidade}` : ''}
      — Unit: ${money(item.price)} — Total: ${money(line)}</p>`;
  });
  checkoutSummaryDiv.innerHTML += `<hr><p><strong>Total: ${money(total)}</strong></p>`;
}

// =========================
// Enviar pedidos para o backend (substitui o localStorage)
// =========================
checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (cart.length === 0) {
    alert('Carrinho vazio!');
    return;
  }

  const nome  = document.getElementById('nome-cliente').value.trim();
  const email = document.getElementById('email-cliente').value.trim();

  if (!nome || !email) {
    alert('Preenche o nome e o email.');
    return;
  }

  try {
    const respostas = await Promise.all(
      cart.map(item => {
        const payload = {
          nome,
          email,
          ramo: RAMO_ATUAL,
          produto: item.product + (item.especialidade ? ' - ' + item.especialidade : ''),
          tamanho: item.size || '',
          quantidade: Number(item.quantity || 1),
          preco_unit: Number(item.price || 0)
        };
        return fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(r => r.json());
      })
    );

    const falhas = respostas.filter(r => !r || r.ok !== true);
    if (falhas.length > 0) {
      console.error('Falhas ao enviar:', falhas);
      alert('Alguns itens não foram enviados. Tenta novamente, por favor.');
      return;
    }

    cart = [];
    updateCartCount();
    checkoutModal.style.display = 'none';
    alert('Pedido confirmado! Recebemos a tua encomenda.');

  } catch (err) {
    console.error(err);
    alert('Erro a enviar o pedido. Verifica a ligação e tenta novamente.');
  }
});

// =========================
// (Opcional) salvar/períodos de encomenda no localStorage
// =========================
function salvarDatas() {
  const di = document.getElementById('data-inicio')?.value;
  const df = document.getElementById('data-fim')?.value;
  if (!di || !df) { alert("Por favor, preencha ambas as datas."); return; }
  localStorage.setItem("dataInicio", di);
  localStorage.setItem("dataFim", df);
  alert("Datas salvas com sucesso!");
  if (typeof atualizarDatasNaTela === 'function') atualizarDatasNaTela();
}
