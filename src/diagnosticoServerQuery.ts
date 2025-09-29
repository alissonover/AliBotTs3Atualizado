import GerenciadorConexaoHibrida from './gerenciadorConexaoHibrida';

class DiagnosticoServerQuery {
    private gerenciadorConexao: GerenciadorConexaoHibrida;
    private serverQuery: any = null;

    constructor() {
        this.gerenciadorConexao = GerenciadorConexaoHibrida.obterInstancia();
    }

    public async executar(): Promise<void> {
        try {
            console.log('🔍 DIAGNÓSTICO DO SERVERQUERY');
            console.log('============================');
            
            // Conectar
            await this.conectar();
            
            // Executar diagnósticos
            await this.verificarConfiguracoes();
            await this.listarClientes();
            await this.verificarCanais();
            await this.testarEnvioMensagem();
            
            console.log('✅ Diagnóstico concluído!');
            
        } catch (error: any) {
            console.log('❌ Erro no diagnóstico:', error.message);
        } finally {
            await this.desconectar();
        }
    }

    private async conectar(): Promise<void> {
        console.log('🔗 Conectando...');
        await this.gerenciadorConexao.resetCompleto();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        this.serverQuery = await this.gerenciadorConexao.obterConexaoUnica();
        
        if (!this.serverQuery) {
            throw new Error('Falha ao conectar');
        }
        
        console.log('✅ Conectado!');
    }

    private async verificarConfiguracoes(): Promise<void> {
        console.log('');
        console.log('📋 CONFIGURAÇÕES DO SERVERQUERY:');
        console.log('================================');
        
        try {
            // Verificar informações do servidor
            const serverInfo = await this.serverQuery.serverInfo();
            console.log('🖥️ Servidor:', serverInfo.virtualserver_name);
            console.log('🎯 Porta:', serverInfo.virtualserver_port);
            console.log('👥 Clientes online:', serverInfo.virtualserver_clientsonline);
            
            // Verificar informações do próprio bot
            const whoami = await this.serverQuery.whoami();
            console.log('🤖 Bot ID:', whoami.client_id);
            console.log('🤖 Bot Channel:', whoami.client_channel_id);
            console.log('🤖 Bot Nickname:', whoami.client_nickname);
            
            // Verificar permissões
            const perms = await this.serverQuery.clientGetIds('serveradmin');
            console.log('🔑 Permissões serveradmin:', perms.length > 0 ? 'SIM' : 'NÃO');
            
        } catch (error: any) {
            console.log('❌ Erro ao verificar configurações:', error.message);
        }
    }

    private async listarClientes(): Promise<void> {
        console.log('');
        console.log('👥 CLIENTES CONECTADOS:');
        console.log('======================');
        
        try {
            const clients = await this.serverQuery.clientList();
            
            clients.forEach((client: any) => {
                if (client.type === 0) { // Apenas clientes reais
                    console.log(`👤 ${client.nickname} (ID: ${client.clid}) - Canal: ${client.cid}`);
                }
            });
            
        } catch (error: any) {
            console.log('❌ Erro ao listar clientes:', error.message);
        }
    }

    private async verificarCanais(): Promise<void> {
        console.log('');
        console.log('📺 CANAIS DO SERVIDOR:');
        console.log('=====================');
        
        try {
            const channels = await this.serverQuery.channelList();
            
            channels.forEach((channel: any) => {
                console.log(`📺 ${channel.channel_name} (ID: ${channel.cid})`);
            });
            
        } catch (error: any) {
            console.log('❌ Erro ao listar canais:', error.message);
        }
    }

    private async testarEnvioMensagem(): Promise<void> {
        console.log('');
        console.log('💬 TESTE DE ENVIO DE MENSAGEM:');
        console.log('==============================');
        
        try {
            // Enviar mensagem para o servidor
            await this.serverQuery.sendTextMessage(0, 3, '🤖 Teste: ServerQuery funcionando!');
            console.log('✅ Mensagem enviada para o servidor!');
            
            // Tentar enviar para todos os clientes online
            const clients = await this.serverQuery.clientList();
            const realClients = clients.filter((c: any) => c.type === 0);
            
            if (realClients.length > 0) {
                const firstClient = realClients[0];
                await this.serverQuery.sendTextMessage(firstClient.clid, 1, '🤖 Teste privado: ServerQuery funcionando!');
                console.log(`✅ Mensagem privada enviada para ${firstClient.nickname}!`);
            }
            
        } catch (error: any) {
            console.log('❌ Erro ao enviar mensagem:', error.message);
        }
    }

    private async desconectar(): Promise<void> {
        console.log('');
        console.log('🔌 Desconectando...');
        await this.gerenciadorConexao.resetCompleto();
        console.log('✅ Desconectado!');
    }
}

// Execução
async function executarDiagnostico() {
    const diagnostico = new DiagnosticoServerQuery();
    await diagnostico.executar();
}

// Auto-execução
if (require.main === module) {
    executarDiagnostico().catch((error) => {
        console.log('💥 Erro fatal:', error.message);
        process.exit(1);
    });
}

export default DiagnosticoServerQuery;