/**
 * Script para resetar o cache de mortes de personagens específicos
 * Útil para forçar nova verificação de mortes que passaram batido
 */

const fs = require('fs');
const path = require('path');

// Personagens para resetar o cache (limpar lastChecked)
const personagensParaResetar = [
    'Hugueraxx',
    'Lynker Healer'
];

const cacheFile = path.join(__dirname, 'mortes-cache.json');

try {
    console.log('📂 Carregando mortes-cache.json...');
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    
    let resetCount = 0;
    
    for (const personagem of personagensParaResetar) {
        if (data[personagem]) {
            console.log(`🔄 Resetando cache de: ${personagem}`);
            console.log(`   Antes: lastChecked = ${data[personagem].lastChecked}`);
            
            // Resetar para epoch zero (força nova verificação)
            data[personagem].lastChecked = new Date(0).toISOString();
            
            console.log(`   Depois: lastChecked = ${data[personagem].lastChecked}`);
            resetCount++;
        } else {
            console.log(`⚠️ Personagem não encontrado no cache: ${personagem}`);
        }
    }
    
    if (resetCount > 0) {
        fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
        console.log(`✅ Cache resetado para ${resetCount} personagem(ns)`);
        console.log('💡 Na próxima verificação, as mortes destes personagens serão reprocessadas');
    } else {
        console.log('⚠️ Nenhum personagem foi resetado');
    }
    
} catch (error) {
    console.error('❌ Erro:', error.message);
}
