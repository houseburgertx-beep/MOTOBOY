// Inicializa o mapa focado na região de Teixeira de Freitas
const map = L.map('map').setView([-17.5353, -39.7427], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let routingControl = null;
let currentLat = null;
let currentLng = null;

// Corrige tamanho do mapa ao carregar a tela
setTimeout(() => { map.invalidateSize(); }, 500);

// Captura a localização atual do motoboy
document.getElementById('locate-btn').addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            currentLat = position.coords.latitude;
            currentLng = position.coords.longitude;
            map.setView([currentLat, currentLng], 16);
            L.marker([currentLat, currentLng]).addTo(map).bindPopup("Sua Base").openPopup();
            alert("Localização atualizada com sucesso!");
        }, () => alert("Erro ao acessar GPS. Permita o acesso no navegador."));
    }
});

// Processamento da Comanda
document.getElementById('process-btn').addEventListener('click', async () => {
    const texto = document.getElementById('comanda-text').value;
    const btn = document.getElementById('process-btn');
    
    if (!texto) {
        alert("Cole os dados do pedido primeiro!");
        return;
    }

    // Extrair Taxa
    const regexTaxa = /(?:taxa|entrega|frete).*?(?:r\$|R\$)\s*(\d+[\.,]\d{2})/i;
    const matchTaxa = texto.match(regexTaxa);
    const taxa = matchTaxa ? matchTaxa[1] : "Calculada via app";

    // Extrair Endereço
    const regexEndereco = /endere[çc]o:\s*(.*)/i;
    const matchEndereco = texto.match(regexEndereco);
    
    if (!matchEndereco) {
        alert("Não achei a palavra 'Endereço:' na comanda. Verifique o texto.");
        return;
    }

    const enderecoLimpo = matchEndereco[1].trim();
    
    // Atualiza Painel Visual
    document.getElementById('dest-address').innerText = enderecoLimpo;
    document.getElementById('dest-fee').innerText = taxa !== "Calculada via app" ? `R$ ${taxa}` : taxa;
    document.getElementById('info-display').classList.remove('hidden');

    // Busca coordenadas
    const enderecoBusca = `${enderecoLimpo}, Teixeira de Freitas, Bahia, Brasil`;
    
    try {
        btn.innerText = "Calculando rota...";
        btn.style.backgroundColor = "#94a3b8"; // cor de carregamento
        
        const resposta = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoBusca)}`);
        const dados = await resposta.json();

        if (dados.length > 0) {
            const destLat = dados[0].lat;
            const destLng = dados[0].lon;
            const startLat = currentLat || -17.5353;
            const startLng = currentLng || -39.7427;

            // Remove rota anterior
            if (routingControl) {
                map.removeControl(routingControl);
            }

            // Traça nova rota
            routingControl = L.Routing.control({
                waypoints: [
                    L.latLng(startLat, startLng),
                    L.latLng(destLat, destLng)
                ],
                routeWhileDragging: false,
                language: 'pt',
                lineOptions: { styles: [{color: '#0284c7', opacity: 0.9, weight: 5}] },
                show: false // Esconde o painel de texto longo de direções para manter o visual limpo
            }).addTo(map);

        } else {
            alert("Endereço não encontrado no mapa. Tente simplificar.");
        }
    } catch (error) {
        alert("Erro ao conectar com o serviço de mapas.");
    } finally {
        btn.innerText = "Calcular Melhor Rota";
        btn.style.backgroundColor = "#0284c7"; // volta cor normal
    }
});
