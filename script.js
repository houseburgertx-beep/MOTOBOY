// --- CONFIGURAÇÃO DO BANCO DE DADOS LOCAL (Dexie.js) ---
const db = new Dexie('RotaPRO_DB');
db.version(1).stores({
    orders: '++id, cliente, bairro, taxa, status, data',
    settings: 'key, value'
});

// --- GERENCIAMENTO DE ABAS (Mobile Bottom Nav) ---
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Ativa botão correspondente
    const navBtn = document.querySelector(`.nav-item[data-target="${tabName}"]`);
    if (navBtn) navBtn.classList.add('active');

    // Se abrir o mapa, força recálculo do tamanho
    if (tabName === 'mapa' && window.mapInstance) {
        setTimeout(() => window.mapInstance.invalidateSize(), 200);
    }
}

// --- INICIALIZAÇÃO DO MAPA ---
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializa Mapa Leaflet centrado em Teixeira de Freitas - BA
    const map = L.map('map').setView([-17.5353, -39.7427], 14);
    window.mapInstance = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Carrega dados iniciais do banco
    await atualizarDashboard();
    await carregarListaPedidos();
});

// --- CADASTRAR NOVO PEDIDO ---
document.getElementById('form-nova-entrega').addEventListener('submit', async (e) => {
    e.preventDefault();

    const cliente = document.getElementById('input-cliente').value;
    const endereco = document.getElementById('input-endereco').value;
    const bairro = document.getElementById('input-bairro').value;
    const taxa = parseFloat(document.getElementById('input-taxa').value);

    await db.orders.add({
        cliente,
        endereco,
        bairro,
        taxa,
        status: 'pendente',
        data: new Date().toLocaleDateString()
    });

    // Limpa formulário e redireciona para a lista
    document.getElementById('form-nova-entrega').reset();
    alert('Entrega cadastrada com sucesso!');
    
    await atualizarDashboard();
    await carregarListaPedidos();
    switchTab('pedidos');
});

// --- ATUALIZAR DASHBOARD E ESTATÍSTICAS ---
async function atualizarDashboard() {
    const hoje = new Date().toLocaleDateString();
    const pedidosHoje = await db.orders.where('data').equals(hoje).toArray();

    const totalEntregas = pedidosHoje.length;
    const somaTaxas = pedidosHoje.reduce((acc, curr) => acc + curr.taxa, 0);

    document.getElementById('stat-total-entregas').innerText = totalEntregas;
    document.getElementById('stat-total-ganhos').innerText = `R$ ${somaTaxas.toFixed(2)}`;
    
    // Ganhos Aba Finanças
    document.getElementById('fin-total').innerText = totalEntregas;
    document.getElementById('fin-taxas').innerText = `R$ ${somaTaxas.toFixed(2)}`;
    document.getElementById('fin-media').innerText = totalEntregas > 0 ? `R$ ${(somaTaxas / totalEntregas).toFixed(2)}` : 'R$ 0,00';
}

// --- CARREGAR LISTA DE PEDIDOS ---
async function carregarListaPedidos() {
    const container = document.getElementById('orders-list-container');
    const pedidos = await db.orders.toArray();

    if (pedidos.length === 0) {
        container.innerHTML = `<p class="empty-text">Nenhum pedido cadastrado hoje.</p>`;
        return;
    }

    container.innerHTML = pedidos.map(p => `
        <div class="card" style="margin-bottom: 10px; padding: 12px;">
            <strong>${p.cliente}</strong> — <span style="color: #34d399;">R$ ${p.taxa.toFixed(2)}</span>
            <p style="font-size: 0.85rem; color: #94a3b8;">${p.endereco}, ${p.bairro}</p>
        </div>
    `).join('');
}
