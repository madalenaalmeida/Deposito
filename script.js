// Variáveis globais
let currentProduct = null;
let currentPrice = null;
let cart = [];

// Elementos do DOM
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
menuBtn.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});

// Ao clicar em um botão "Adicionar ao Carrinho"
const addButtons = document.querySelectorAll('.adicionar');
addButtons.forEach(button => {
  button.addEventListener('click', function() {
    currentProduct = this.dataset.produto;
    currentPrice = this.dataset.preco;
    
    // Lê as opções definidas no atributo data-options
    const options = this.dataset.options 
      ? this.dataset.options.split(',').map(opt => opt.trim().toLowerCase())
      : [];
    
    // Configurar o campo Tamanho
    if (options.includes('tamanho')) {
      tamanhoField.style.display = 'inline-block';
      tamanhoLabel.style.display = 'block';
      tamanhoField.value = 'P'; // Valor padrão
    } else {
      tamanhoField.style.display = 'none';
      tamanhoLabel.style.display = 'none';
      tamanhoField.value = '';
    }
    
    // Configurar o campo Quantidade
    if (options.includes('quantidade')) {
      quantidadeField.style.display = 'inline-block';
      quantidadeLabel.style.display = 'block';
      quantidadeField.value = 1; // Valor padrão
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

// Fechar modal de seleção
modalClose.addEventListener('click', () => {
  modal.style.display = 'none';
});

// Processar formulário do modal para adicionar ao carrinho
modalForm.addEventListener('submit', (event) => {
  event.preventDefault();
  
  // Coleta os valores dos campos somente se estiverem visíveis
  const tamanho = (tamanhoField.style.display !== 'none') ? tamanhoField.value : "";
  const quantidade = (quantidadeField.style.display !== 'none') ? quantidadeField.value : "";
  const especialidade = (especialidadeField.style.display !== 'none') ? especialidadeField.value : "";
  
  // Adiciona o item ao carrinho com os dados coletados
  cart.push({ 
    branch: 'Avezinhas', 
    product: currentProduct, 
    price: currentPrice,
    size: tamanho, 
    quantity: quantidade,
    especialidade: especialidade
  });
  
  updateCartCount();
  alert(`Adicionado: ${currentProduct} - ${quantidade ? quantidade + ' unidade(s)' : ''}${tamanho ? ', Tamanho: ' + tamanho : ''}${especialidade ? ', Especialidade: ' + especialidade : ''}`);
  
  modal.style.display = 'none';
});

// Atualizar a contagem do carrinho
function updateCartCount() {
  cartCountSpan.textContent = cart.length;
}

// Abrir modal do carrinho
cartBtn.addEventListener('click', () => {
  displayCartItems();
  cartModal.style.display = 'block';
});

// Fechar modal do carrinho
cartModalClose.addEventListener('click', () => {
  cartModal.style.display = 'none';
});

// Fechar modais ao clicar fora
window.addEventListener('click', (event) => {
  if (event.target === modal) modal.style.display = 'none';
  if (event.target === cartModal) cartModal.style.display = 'none';
  if (event.target === checkoutModal) checkoutModal.style.display = 'none';
});

// Exibir itens do carrinho no modal
function displayCartItems() {
  cartItemsDiv.innerHTML = '';
  if (cart.length === 0) {
    cartItemsDiv.innerHTML = '<p>Carrinho vazio.</p>';
  } else {
    cart.forEach((item, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.classList.add('cart-item');
      let text = `${item.product} - ${item.quantity ? 'Quantidade: ' + item.quantity : ''}${item.size ? ' - Tamanho: ' + item.size : ''}${item.especialidade ? ' - Especialidade: ' + item.especialidade : ''} - Preço: € ${item.price}`;
      itemDiv.innerHTML = `<p>${text}</p>`;
      // Botão para remover item do carrinho
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remover';
      removeBtn.addEventListener('click', () => {
        cart.splice(index, 1);
        updateCartCount();
        displayCartItems();
      });
      itemDiv.appendChild(removeBtn);
      cartItemsDiv.appendChild(itemDiv);
    });
  }
}

// Ao clicar em "Confirmar" no carrinho, abre o modal de checkout
confirmCartBtn.addEventListener('click', () => {
  if (cart.length === 0) {
    alert('Carrinho vazio!');
  } else {
    displayCheckoutSummary();
    cartModal.style.display = 'none';
    checkoutModal.style.display = 'block';
  }
});

// Montar resumo do pedido no modal de checkout
function displayCheckoutSummary() {
  checkoutSummaryDiv.innerHTML = '';
  if (cart.length === 0) {
    checkoutSummaryDiv.innerHTML = '<p>Carrinho vazio.</p>';
  } else {
    cart.forEach(item => {
      let text = `${item.product} - ${item.quantity ? 'Quantidade: ' + item.quantity : ''}${item.size ? ' - Tamanho: ' + item.size : ''}${item.especialidade ? ' - Especialidade: ' + item.especialidade : ''} - Preço: € ${item.price}`;
      checkoutSummaryDiv.innerHTML += `<p>${text}</p>`;
    });
  }
}

// Processar formulário de checkout
checkoutForm.addEventListener('submit', (event) => {
  event.preventDefault();
  
  const nome = document.getElementById('nome-cliente').value;
  const email = document.getElementById('email-cliente').value;
  
  // Criar array de pedidos
  const pedidos = cart.map(item => ({
    ramo: item.branch,
    produto: item.product,
    tamanho: item.size,
    quantidade: item.quantity,
    preco: item.price,
    especialidade: item.especialidade,
    nome: nome,
    email: email
  }));
  
  // Salvar pedidos no localStorage
  const existingPedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
  const updatedPedidos = existingPedidos.concat(pedidos);
  localStorage.setItem('pedidos', JSON.stringify(updatedPedidos));
  
  // Limpar carrinho e fechar modal
  cart = [];
  updateCartCount();
  checkoutModal.style.display = 'none';
  alert('Pedido confirmado com sucesso!');
});
// Função para salvar as datas de encomenda
function salvarDatas() {
  const dataInicio = document.getElementById('data-inicio').value;
  const dataFim = document.getElementById('data-fim').value;

  // Verificar se as datas estão válidas
  if (!dataInicio || !dataFim) {
    alert("Por favor, preencha ambas as datas.");
    return;
  }

  // Salvar as datas no localStorage (ou em outro banco de dados)
  localStorage.setItem("dataInicio", dataInicio);
  localStorage.setItem("dataFim", dataFim);

  // Avisar o administrador que as datas foram salvas
  alert("Datas salvas com sucesso!");

  // Atualizar a interface ou realizar outras ações necessárias
  atualizarDatasNaTela();
}

