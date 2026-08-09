// Inicializa o mapa focado na região
const map = L.map('map').setView([-17.5353, -39.7427], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let routingControl = null;
let currentLat = null;
let currentLng = null;

// Captura a localização atual do motoboy
document.getElementById('locate-btn').addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            currentLat = position.coords.latitude;
            currentLng = position.coords.longitude;
            map.setView([currentLat, currentLng], 16);
            L.marker([currentLat, currentLng]).addTo(map).bindPopup("Você está aqui").openPopup();
        }, () => alert("Erro ao acessar GPS."));
    }
});

// Botão para processar a comanda
document.getElementById('process-btn').addEventListener('click', async () => {
    const texto = document.getElementById('comanda-text').value;
    if (!texto) {
        alert("Cole a comanda primeiro!");
        return;
    }

    // 1. EXTRAIR A TAXA (Procura por "Taxa", "Frete" ou "Entrega" seguido de R$)
    const regexTaxa = /(?:taxa|entrega|frete).*?(?:r\$|R\$)\s*(\d+[\.,]\d{2})/i;
    const matchTaxa = texto.match(regexTaxa);
    const taxa = matchTaxa ? matchTaxa[1] : "Não identificada";

    // 2. EXTRAIR O ENDEREÇO (Procura a linha que começa com "Endereço")
    const regexEndereco = /endere[çc]o:\s*(.*)/i;
    const matchEndereco = texto.match(regexEndereco);
    
    if (!matchEndereco) {
        alert("Não foi possível encontrar o 'Endereço:' na comanda. Digite 'Endereço: [nome da rua]'");
        return;
    }

    const enderecoLimpo = matchEndereco[1].trim();
    
    // Mostra as informações na tela
    document.getElementById('dest-address').innerText = enderecoLimpo;
    document.getElementById('dest-fee').innerText = taxa !== "Não identificada" ? `R$ ${taxa}` : taxa;
    document.getElementById('info-display').classList.remove('hidden');

    // 3. CONVERTER ENDEREÇO EM COORDENADAS (Geocoding)
    // Adicionamos a cidade padrão para ajudar o buscador gratuito a não errar o país
    const enderecoBusca = `${enderecoLimpo}, Teixeira de Freitas, Bahia, Brasil`;
    
    try {
        document.getElementById('process-btn').innerText = "Buscando rota...";
        
        const resposta = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoBusca)}`);
        const dados = await resposta.json();

        if (dados.length > 0) {
            const destLat = dados[0].lat;
            const destLng = dados[0].lon;

            // Se o motoboy não clicou em localizar, usa um ponto central genérico de partida
            const startLat = currentLat || -17.5353;
            const startLng = currentLng || -39.7427;

            // 4. DESENHAR A ROTA
            if (routingControl) {
                map.removeControl(routingControl);
            }

            routingControl = L.Routing.control({
                waypoints: [
                    L.latLng(startLat, startLng),
                    L.latLng(destLat, destLng)
                ],
                routeWhileDragging: false,
                language: 'pt',
                lineOptions: { styles: [{color: '#27ae60', opacity: 0.9, weight: 6}] }
            }).addTo(map);

        } else {
            alert("Rua não encontrada no mapa. Tente simplificar o nome da rua (Ex: remova números ou bairro).");
        }
    } catch (error) {
        alert("Erro de conexão ao buscar o endereço.");
    } finally {
        document.getElementById('process-btn').innerText = "Traçar Rota";
    }
});
