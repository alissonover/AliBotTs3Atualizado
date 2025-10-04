import SistemaHibridoOptimizado from './sistemaHibridoOptimizado';

// Função principal
async function main() {
  console.log("🚀 Iniciando AliBotTS3...");
  
  const sistema = new SistemaHibridoOptimizado();

  // Lidar com sinais de interrupção
  process.on('SIGINT', async () => {
    console.log("\n🛑 Interrompendo bot...");
    await sistema.parar();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log("\n🛑 Terminando bot...");
    await sistema.parar();
    process.exit(0);
  });

  try {
    await sistema.iniciar();
    console.log("🤖 Bot AliBotTS3 está rodando! Pressione Ctrl+C para parar.");
    
  } catch (error) {
    console.error("💥 Falha ao iniciar o bot:", error);
    process.exit(1);
  }
}

// Executar o bot se este arquivo for executado diretamente
if (require.main === module) {
  main();
}
