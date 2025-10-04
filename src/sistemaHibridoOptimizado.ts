import GerenciadorConexaoHibrida from './gerenciadorConexaoHibrida';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface MembroOnline {
    nome: string;
    level: number;
    vocacao: string;
}

interface RespawnTimer {
    codigo: string;
    nome: string;
    jogador: string;
    tempoRestante: number; // em segundos
    iniciadoEm: Date;
    duracaoTotal: number; // em segundos
    ultimoMinutoProcessado: number; // para controlar decrementos individuais
}

interface FilaItem {
    jogador: string;
    posicao: number;
    adicionadoEm: Date;
    tempoDesejado?: number; // tempo em segundos que o jogador quer quando assumir
}

interface NextTimer {
    codigo: string;
    jogador: string;
    tempoRestante: number; // 10 minutos = 600 segundos
    iniciadoEm: Date;
    tempoDesejado?: number; // tempo que o jogador quer usar quando aceitar
    ultimoMinutoProcessado: number; // para controlar decrementos individuais
}

interface FilasAtivas {
    [codigo: string]: FilaItem[];
}

interface NextTimersAtivos {
    [codigo: string]: NextTimer;
}

interface TimersAtivos {
    [codigo: string]: RespawnTimer;
}

interface RespawnsList {
    [codigo: string]: string; // codigo -> nome do respawn
}

interface PlayerDeath {
    character: {
        name: string;
        level: number;
        vocation: string;
    };
    time: string;
    reason: string;
}

interface DeathMonitorData {
    character: string;
    lastChecked: string; // ISO string da última verificação
    recentDeaths: PlayerDeath[];
}

interface DeathListEntry {
    nome: string;
    level: number;
    vocacao: string;
    horario: string; // formato DD/MM/AAAA HH:MM
    causa: string;
    tipo: 'Friend' | 'Hunted';
    timestamp: Date; // para ordenação
}

class SistemaHibridoOptimizado {
    private gerenciadorConexao: GerenciadorConexaoHibrida;
    private sistemaAtivo: boolean = false;
    private serverQuery: any = null;
    private timersRespawn: TimersAtivos = {};
    private filasClaimeds: FilasAtivas = {};
    private nextTimers: NextTimersAtivos = {};
    private intervalTimers: NodeJS.Timeout | null = null;
    private respawnsList: RespawnsList = {};
    private huntedsList: string[] = [];
    private friendsList: string[] = []; // Lista de friends para monitoramento de mortes
    private huntedsOnlineAnterior: string[] = []; // Para rastrear mudanÃ§as de status
    private notificacoesHuntedsAtivas: boolean = true; // Controlar se notificaÃ§Ãµes estÃ£o ativas
    private deathMonitorData: Map<string, DeathMonitorData> = new Map(); // Cache de mortes por personagem
    
    // Sistema de Deathlist
    private deathListEntries: DeathListEntry[] = []; // Lista de mortes do dia
    private ultimoResetDeathlist: Date = new Date(); // Última vez que a lista foi resetada
    private intervalResetDeathlist: NodeJS.Timeout | null = null; // Timer para reset diário às 06:00
    
    // Configurações de monitoramento de mortes
    private readonly LIMITE_TEMPO_MORTE_MINUTOS = 20; // Só notificar mortes até X minutos atrás
    private deathMonitorInterval: NodeJS.Timeout | null = null; // Timer para verificaÃ§Ã£o de mortes

    constructor() {
        this.gerenciadorConexao = GerenciadorConexaoHibrida.obterInstancia();
        this.carregarRespawnsPersistidos();
        this.carregarHuntedsList();
        this.carregarFriendsList();
        this.carregarDeathMonitorData();
        this.inicializarSistemaDeathlist();
    }

    public async iniciar(): Promise<void> {
        try {
            console.log('');
            console.log('🚀 ===============================================');
            console.log('🚀  SISTEMA HÍBRIDO OTIMIZADO - VERSÃO PRO');
            console.log('🚀 ===============================================');
            console.log('💡 Presume que o TeamSpeak já está aberto');
            console.log('⚡ Reconexão inteligente com dados persistentes');
            console.log('🎯 Performance máxima e simplicidade total');
            console.log('===============================================');
            console.log('');

            // Conectar ServerQuery com reconexão inteligente
            console.log('🔗 Conectando ServerQuery com reconexão inteligente...');
            this.serverQuery = await this.conectarServerQueryComReconexao();
            
            if (!this.serverQuery) {
                throw new Error('Falha ao conectar ServerQuery');
            }

            console.log('✅ ServerQuery conectado com sucesso!');

            // Configurar monitoramento inteligente
            console.log('🧠 Configurando monitoramento inteligente...');
            await this.configurarMonitoramentoOtimizado();

            // Sistema ativo
            this.sistemaAtivo = true;

            // Atualizar canal deathlist na inicialização
            console.log('💀 Atualizando canal Deathlist inicial...');
            try {
                // Primeiro, listar canais para debug
                await this.listarCanaisParaDebug();
                
                await this.atualizarCanalDeathlist();
                console.log('✅ Canal Deathlist atualizado na inicialização');
            } catch (error: any) {
                console.log('⚠️ Erro ao atualizar canal Deathlist na inicialização:', error.message);
            }

            // Sincronizar friends do canal na inicialização
            console.log('👥 Sincronizando friends do canal na inicialização...');
            try {
                await this.sincronizarFriendsDoCanal();
                console.log('✅ Friends sincronizados na inicialização');
            } catch (error: any) {
                console.log('⚠️ Erro ao sincronizar friends na inicialização:', error.message);
            }

            console.log('');
            console.log('🎉 ===============================================');
            console.log('🎉  SISTEMA HÍBRIDO OTIMIZADO ATIVO!');
            console.log('🎉 ===============================================');
            console.log('✅ ServerQuery: Conectado e ultra-responsivo');
            console.log('✅ Monitoramento: Inteligente e eficiente');
            console.log('� Reconexão: Automática com dados persistentes');
            console.log('⚡ Comandos: !help, !status, !ping, !info, !users, !friends, !claimeds, !sync');
            console.log('🚀 Performance: MÁXIMA (sem overhead de abertura)');
            console.log('🔄 Atualização automática: Friends (1min) | Claimeds (30s)');
            console.log('===============================================');
            console.log('');

            // Verificar se há clientes conectados
            await this.verificarClientesConectados();

            // Fazer primeira atualização dos canais
            console.log('🔄 Fazendo primeira atualização dos canais...');
            try {
                await this.atualizarCanalFriends();
                console.log('✅ Canal Friends inicializado');
            } catch (error: any) {
                console.log('⚠️ Erro na inicialização do canal Friends:', error.message);
            }

            try {
                await this.atualizarCanalClaimeds();
                console.log('✅ Canal Claimeds inicializado');
            } catch (error: any) {
                console.log('⚠️ Erro na inicialização do canal Claimeds:', error.message);
            }

            try {
                await this.atualizarCanalRespawnsList();
                console.log('✅ Canal Respawns List inicializado');
            } catch (error: any) {
                console.log('⚠️ Erro na inicialização do canal Respawns List:', error.message);
            }

            try {
                await this.atualizarCanalHunteds();
                console.log('✅ Canal Hunteds inicializado');
            } catch (error: any) {
                console.log('⚠️ Erro na inicialização do canal Hunteds:', error.message);
            }

            // Configurar handlers de saída
            this.configurarHandlersSaida();

            // Monitoramento automático com timers
            this.iniciarMonitoramentoLeve();

        } catch (error: any) {
            console.log('❌ Erro crítico:', error.message);
            await this.parar();
            process.exit(1);
        }
    }

    private async conectarServerQueryComReconexao(): Promise<any> {
        let tentativas = 0;
        const maxTentativas = 5; // Mais tentativas para maior resistência
        let conexao = null;

        while (tentativas < maxTentativas) {
            try {
                console.log(`🔗 Tentativa de conexão ${tentativas + 1}/${maxTentativas}...`);
                
                // Tentar usar conexão existente primeiro
                const conexaoExistente = this.gerenciadorConexao.obterConexaoAtual();
                if (conexaoExistente) {
                    console.log('🔄 Reutilizando conexão existente...');
                    
                    // Testar se a conexão ainda funciona
                    try {
                        await conexaoExistente.serverInfo();
                        console.log('✅ Conexão existente ainda válida!');
                        return conexaoExistente;
                    } catch (testError) {
                        console.log('⚠️ Conexão existente inválida, criando nova...');
                    }
                }
                
                // Se não há conexão válida, criar nova
                console.log('🆕 Criando nova conexão ServerQuery...');
                conexao = await this.gerenciadorConexao.obterConexaoUnica();
                
                if (conexao) {
                    console.log('✅ Conexão ServerQuery estabelecida com sucesso!');
                    return conexao;
                }
                
            } catch (error: any) {
                tentativas++;
                console.log(`⚠️ Tentativa ${tentativas} falhou: ${error.message}`);
                
                // Estratégias específicas de recuperação
                if (error.message.includes('too many')) {
                    console.log('⏳ Muitas sessões ativas - aguardando 10s...');
                    await new Promise(resolve => setTimeout(resolve, 10000));
                } else if (error.message.includes('connection')) {
                    console.log('🔌 Problema de conexão - aguardando 5s...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } else {
                    console.log('🔄 Erro genérico - aguardando 3s...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
                
                // Reset suave apenas se necessário
                if (tentativas === Math.floor(maxTentativas / 2)) {
                    console.log('🔄 Tentativa de reset suave na metade das tentativas...');
                    try {
                        await this.gerenciadorConexao.resetCompleto();
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } catch (resetError) {
                        console.log('⚠️ Reset suave falhou, continuando...');
                    }
                }
            }
        }

        console.log('❌ Todas as tentativas de conexão falharam');
        return null;
    }

    private async tentarReconexao(): Promise<void> {
        if (!this.sistemaAtivo) {
            console.log('🛑 Sistema não está ativo - ignorando reconexão');
            return;
        }

        console.log('🔄 Iniciando processo de reconexão automática...');
        
        // Limpar conexão atual
        this.serverQuery = null;
        
        let tentativa = 0;
        const maxTentativas = 10;
        
        while (tentativa < maxTentativas && this.sistemaAtivo) {
            tentativa++;
            console.log(`🔄 Tentativa de reconexão ${tentativa}/${maxTentativas}...`);
            
            try {
                // Aguardar um pouco antes de tentar reconectar
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Tentar reconectar
                this.serverQuery = await this.conectarServerQueryComReconexao();
                
                if (this.serverQuery) {
                    console.log('✅ Reconexão bem-sucedida!');
                    
                    // Reconfigurar monitoramento
                    await this.configurarMonitoramentoOtimizado();
                    
                    console.log('🎉 Sistema totalmente restaurado após reconexão!');
                    return;
                }
                
            } catch (error: any) {
                console.log(`❌ Tentativa de reconexão ${tentativa} falhou:`, error.message);
                
                // Aguardar mais tempo entre tentativas se houver muitos erros
                if (tentativa >= 5) {
                    console.log('⏳ Aguardando mais tempo devido a múltiplas falhas...');
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            }
        }
        
        if (this.sistemaAtivo) {
            console.log('❌ Falha na reconexão automática após múltiplas tentativas');
            console.log('🔄 Sistema continuará tentando em background...');
            
            // Tentar novamente em 30 segundos
            setTimeout(() => {
                if (this.sistemaAtivo && !this.serverQuery) {
                    this.tentarReconexao();
                }
            }, 30000);
        }
    }

    private async verificarConexaoValida(): Promise<boolean> {
        if (!this.serverQuery) {
            console.log('🔌 ServerQuery não está conectado');
            if (this.sistemaAtivo) {
                this.tentarReconexao();
            }
            return false;
        }

        try {
            // Tentar uma operação simples para verificar se a conexão está válida
            await this.serverQuery.serverInfo();
            return true;
        } catch (error: any) {
            console.log('❌ Conexão ServerQuery inválida:', error.message);
            if (this.sistemaAtivo) {
                this.tentarReconexao();
            }
            return false;
        }
    }

    private async configurarMonitoramentoOtimizado(): Promise<void> {
        console.log('🧠 Configurando monitoramento inteligente...');

        // ===== REGISTRAR EVENTOS DE NOTIFICAÇÃO =====
        console.log('🔔 Registrando notificações de mensagens...');
        
        try {
            // Registrar para receber notificações de mensagens de texto
            await this.serverQuery.registerEvent('textchannel');
            console.log('✅ Notificações de canal registradas');
            
            await this.serverQuery.registerEvent('textprivate');
            console.log('✅ Notificações privadas registradas');
            
            await this.serverQuery.registerEvent('textserver');
            console.log('✅ Notificações de servidor registradas');
            
            // Registrar outros eventos importantes
            await this.serverQuery.registerEvent('channel');
            console.log('✅ Eventos de canal registrados');
            
        } catch (error: any) {
            console.log('⚠️ Aviso ao configurar notificações:', error.message);
        }

        // Monitorar TODAS as mensagens com logs detalhados
        this.serverQuery.on("textmessage", async (ev: any) => {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`📨 [${timestamp}] ===== NOVA MENSAGEM RECEBIDA =====`);
            console.log(`👤 De: ${ev.invoker?.clientNickname || 'Desconhecido'} (ID: ${ev.invoker?.clid || 'N/A'})`);
            console.log(`💬 Mensagem: "${ev.msg}"`);
            console.log(`📍 Tipo: ${ev.targetmode || 'N/A'}`);
            console.log(`🎯 Target: ${ev.target || 'N/A'}`);
            console.log(`======================================`);
            
            // Processamento imediato para comandos
            if (ev.msg && ev.msg.startsWith('!')) {
                console.log(`⚡ [${timestamp}] COMANDO DETECTADO: ${ev.msg}`);
                console.log(`🔄 Iniciando processamento...`);
                try {
                    await this.processarComandoOtimizado(ev.msg, ev.invoker);
                    console.log(`✅ [${timestamp}] Comando processado com sucesso`);
                } catch (error: any) {
                    console.log(`❌ [${timestamp}] Erro ao processar comando:`, error.message);
                }
            } else {
                console.log(`💭 [${timestamp}] Mensagem ignorada (não é comando)`);
            }
        });

        // Monitorar entradas/saídas de clientes
        this.serverQuery.on("cliententerview", (ev: any) => {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`👋 [${timestamp}] Cliente conectou: ${ev.client?.nickname || 'Desconhecido'}`);
        });

        // ADICIONAR MONITORAMENTO DE CONEXÃO E AUTO-RECONEXÃO
        this.serverQuery.on("close", async () => {
            console.log('🔌 Conexão ServerQuery perdida - iniciando auto-reconexão...');
            await this.tentarReconexao();
        });

        this.serverQuery.on("error", async (error: any) => {
            console.log('❌ Erro na conexão ServerQuery:', error.message);
            if (error.message.includes('connection') || error.message.includes('socket')) {
                console.log('🔄 Iniciando reconexão devido a erro de conexão...');
                await this.tentarReconexao();
            }
        });

        console.log('✅ Monitoramento inteligente ativo com auto-reconexão!');
    }

    private async processarComandoOtimizado(comando: string, remetente: any): Promise<void> {
        try {
            // Verificar se a conexão está válida antes de processar comandos
            if (!await this.verificarConexaoValida()) {
                console.log('⚠️ Conexão inválida detectada durante processamento de comando');
                return;
            }
            
            let resposta = '';
            const timestamp = new Date().toLocaleTimeString();

            switch (comando.toLowerCase()) {
                case '!help':
                case '!ajuda':
                    resposta = `
🤖 AliBot - Comandos:
!help - Esta ajuda
!status - Status do sistema
!ping - Teste de resposta
!users - Usuários online
!time - Horário atual

🔧 Comandos de Administração:
!addresp [código] [nome] - Adicionar respawn
!delresp [código] - Remover respawn

🎯 Comandos de Hunteds:
!addhunted [nome] - Adicionar hunted
!delhunted [nome] - Remover hunted
!hunteds - Atualizar lista de hunteds
!alertas on/off - Ativar/desativar notificações
!alertas - Ver status das notificações`;
                    break;
                
                case '!status':
                    const uptime = process.uptime();
                    const uptimeMin = Math.floor(uptime / 60);
                    resposta = `✅ Sistema Híbrido Otimizado ATIVO!
🔗 ServerQuery: Online e responsivo
👁️ Cliente: Presumido conectado
⏰ Uptime: ${uptimeMin} minutos
🚀 Performance: MÁXIMA

🔄 Atualização Automática:
👥 Friends: A cada 1 minuto
⏰ Claimeds: A cada 30 segundos
💓 Status: A cada 2 minutos

📊 Timestamp: ${timestamp}`;
                    break;
                
                case '!ping':
                    const start = Date.now();
                    // Simular latência mínima
                    await new Promise(resolve => setTimeout(resolve, 1));
                    const latencia = Date.now() - start;
                    resposta = `🏓 PONG! Sistema híbrido ultra-responsivo!
⚡ Latência: ${latencia}ms
🎯 Status: OTIMIZADO`;
                    break;

                case '!info':
                    try {
                        const serverInfo = await this.serverQuery.serverInfo();
                        resposta = `📊 Informações do Servidor:
🏷️ Nome: ${serverInfo.virtualServerName}
👥 Online: ${serverInfo.virtualServerClientsonline}/${serverInfo.virtualServerMaxclients}
⏰ Uptime: ${Math.floor(serverInfo.virtualServerUptime / 3600)}h`;
                    } catch (error) {
                        resposta = '❌ Erro ao obter informações do servidor';
                    }
                    break;

                case '!users':
                    try {
                        const clients = await this.serverQuery.clientList();
                        const realClients = clients.filter((c: any) => c.type === 0);
                        const userList = realClients.slice(0, 5).map((c: any) => `👤 ${c.nickname}`).join('\n');
                        resposta = `👥 Usuários Online (${realClients.length}):
${userList}${realClients.length > 5 ? '\n... e mais ' + (realClients.length - 5) + ' usuários' : ''}`;
                    } catch (error) {
                        resposta = '❌ Erro ao listar usuários';
                    }
                    break;

                case '!time':
                    const now = new Date();
                    resposta = `⏰ Horário Atual:
📅 Data: ${now.toLocaleDateString('pt-BR')}
🕐 Hora: ${now.toLocaleTimeString('pt-BR')}
🌐 Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
                    break;

                case '!update-friends':
                case '!friends':
                    try {
                        await this.atualizarCanalFriends();
                        resposta = `✅ Canal Friends atualizado com sucesso!
🔄 Verificando membros online da guild...
📊 Sistema automático ativo a cada 2 minutos`;
                    } catch (error: any) {
                        resposta = `❌ Erro ao atualizar canal Friends: ${error.message}`;
                    }
                    break;

                case '!update-claimeds':
                case '!claimeds':
                    try {
                        await this.atualizarCanalClaimeds();
                        resposta = `✅ Canal Claimeds atualizado com sucesso!
⏰ Timers sincronizados
📊 Sistema automático ativo a cada 30 segundos`;
                    } catch (error: any) {
                        resposta = `❌ Erro ao atualizar canal Claimeds: ${error.message}`;
                    }
                    break;

                case '!update-respawns':
                case '!respawns':
                    try {
                        await this.atualizarCanalRespawnsList();
                        resposta = `✅ Canal Respawns List atualizado com sucesso!
📋 Lista de respawns atualizada
💡 Todos os códigos disponíveis listados`;
                    } catch (error: any) {
                        resposta = `❌ Erro ao atualizar canal Respawns List: ${error.message}`;
                    }
                    break;

                case '!update-all':
                case '!sync':
                    try {
                        await this.atualizarCanalFriends();
                        await this.atualizarCanalClaimeds();
                        await this.atualizarCanalRespawnsList();
                        await this.atualizarCanalHunteds();
                        resposta = `✅ Todos os canais atualizados com sucesso!
👥 Friends: Membros online sincronizados
⏰ Claimeds: Timers sincronizados
📋 Respawns List: Lista de respawns atualizada
🎯 Hunteds: Lista de hunteds atualizada
🚀 Sistema híbrido totalmente sincronizado`;
                    } catch (error: any) {
                        resposta = `❌ Erro na sincronização: ${error.message}`;
                    }
                    break;

                case '!debug-client':
                case '!debugclient':
                    try {
                        // Debug detalhado do cliente
                        const clientId = remetente.invokerid || remetente.clid;
                        let debugInfo = `🧪 DEBUG COMPLETO DO CLIENTE\n\n`;
                        
                        // Dados do remetente
                        debugInfo += `📋 Dados do Remetente:\n`;
                        debugInfo += `   Raw: ${JSON.stringify(remetente, null, 2)}\n\n`;
                        
                        if (this.serverQuery && clientId) {
                            try {
                                // ClientInfo
                                const clientInfo = await this.serverQuery.clientInfo(clientId);
                                debugInfo += `📡 ClientInfo:\n`;
                                debugInfo += `   Raw: ${JSON.stringify(clientInfo, null, 2)}\n\n`;
                                
                                // Todas as propriedades do clientInfo
                                debugInfo += `📝 Propriedades ClientInfo:\n`;
                                for (const [key, value] of Object.entries(clientInfo)) {
                                    debugInfo += `   ${key}: "${value}"\n`;
                                }
                                debugInfo += `\n`;
                                
                            } catch (error: any) {
                                debugInfo += `❌ Erro ClientInfo: ${error.message}\n\n`;
                            }
                            
                            try {
                                // ClientList
                                const clientes = await this.serverQuery.clientList();
                                const cliente = clientes.find((c: any) => c.clid == clientId);
                                debugInfo += `👥 ClientList (cliente específico):\n`;
                                debugInfo += `   Raw: ${JSON.stringify(cliente, null, 2)}\n\n`;
                                
                                if (cliente) {
                                    debugInfo += `📝 Propriedades ClientList:\n`;
                                    for (const [key, value] of Object.entries(cliente)) {
                                        debugInfo += `   ${key}: "${value}"\n`;
                                    }
                                }
                                
                            } catch (error: any) {
                                debugInfo += `❌ Erro ClientList: ${error.message}\n\n`;
                            }
                        }
                        
                        resposta = debugInfo;
                    } catch (error: any) {
                        resposta = `❌ Erro no debug: ${error.message}`;
                    }
                    break;

                case '!test-desc':
                case '!testdesc':
                    try {
                        // Testar leitura de descrição
                        const resultadoTeste = await this.obterNomeJogadorPorDescricao(remetente);
                        
                        let mensagemTeste = `🧪 TESTE DE DESCRIÇÃO\n\n`;
                        mensagemTeste += `👤 Nickname TS: ${remetente.clientNickname || remetente.nickname || 'N/A'}\n`;
                        mensagemTeste += `🔢 Client ID: ${remetente.invokerid || remetente.clid || 'N/A'}\n`;
                        mensagemTeste += `📝 Descrição válida: ${resultadoTeste.valido ? '✅ SIM' : '❌ NÃO'}\n`;
                        
                        if (resultadoTeste.valido) {
                            mensagemTeste += `🎯 Nome do jogo: ${resultadoTeste.nome}\n`;
                            mensagemTeste += `\n✅ Resultado: Comandos de claimed funcionarão normalmente!`;
                        } else {
                            mensagemTeste += `\n❌ Problema: ${resultadoTeste.erro || 'Descrição não configurada'}`;
                        }
                        
                        resposta = mensagemTeste;
                    } catch (error: any) {
                        resposta = `❌ Erro no teste de descrição: ${error.message}`;
                    }
                    break;

                case '!test-bbcode':
                case '!testlink':
                    try {
                        // Testar se BBCode funciona em mensagens privadas
                        const clientId = remetente.clid;
                        const nomeCliente = remetente.clientNickname || remetente.nickname || 'Teste';
                        
                        const testeBBCode = `🧪 TESTE DE BBCODE - Links de Cliente:

1. Formato [client=ID]: [client=${clientId}]${nomeCliente}[/client]
2. Formato [CLIENT=ID]: [CLIENT=${clientId}]${nomeCliente}[/CLIENT]  
3. Formato [url=client://0/ID]: [url=client://0/${clientId}]${nomeCliente}[/url]
4. Formato [URL=client://ID]: [URL=client://${clientId}]${nomeCliente}[/URL]
5. Sem BBCode: ${nomeCliente}

🔍 Teste: Clique nos links acima. O que funcionar deve abrir um menu de contexto.
✅ Se funcionou: Responda com o número do formato
❌ Se nenhum funcionou: BBCode pode não ser suportado em mensagens`;

                        resposta = testeBBCode;
                    } catch (error: any) {
                        resposta = `❌ Erro ao testar BBCode: ${error.message}`;
                    }
                    break;

                case '!test-api':
                case '!api':
                    try {
                        const membrosOnline = await this.buscarMembrosOnlineTibia();
                        if (membrosOnline.length > 0) {
                            const nomes = membrosOnline.slice(0, 5).map(m => `${m.name} (Lv.${m.level})`).join(', ');
                            resposta = `✅ API do Tibia funcionando!
🔍 Guild: Missclick
👥 Online: ${membrosOnline.length} membros
📋 Alguns: ${nomes}${membrosOnline.length > 5 ? '...' : ''}
📡 Fonte: TibiaData v4`;
                        } else {
                            resposta = `✅ API do Tibia conectada!
🔍 Guild: Missclick  
👥 Nenhum membro online no momento
📡 Fonte: TibiaData v4`;
                        }
                    } catch (error: any) {
                        resposta = `❌ Erro ao testar API: ${error.message}`;
                    }
                    break;
                
                default:
                    // Verificar se é comando !resp
                    if (comando.toLowerCase().startsWith('!resp ')) {
                        resposta = await this.processarComandoResp(comando, remetente);
                    } else if (comando.toLowerCase().startsWith('!leave ')) {
                        resposta = await this.processarComandoLeave(comando, remetente);
                    } else if (comando.toLowerCase().startsWith('!fila ')) {
                        resposta = await this.processarComandoFila(comando, remetente);
                    } else if (comando.toLowerCase().startsWith('!next ')) {
                        resposta = await this.processarComandoNext(comando, remetente);
                    } else if (comando.toLowerCase().startsWith('!addresp ')) {
                        resposta = await this.processarComandoAddResp(comando, remetente);
                    } else if (comando.toLowerCase().startsWith('!delresp ') || comando.toLowerCase().startsWith('!deleteresp ')) {
                        resposta = await this.processarComandoDelResp(comando, remetente);
                    } else if (comando.toLowerCase() === '!listplaces') {
                        resposta = await this.processarComandoListPlaces(comando, remetente);
                    } else if (comando.toLowerCase() === '!backuprespawns') {
                        resposta = await this.processarComandoBackupRespawns(comando, remetente);
                    } else if (comando.toLowerCase() === '!bot') {
                        resposta = await this.processarComandoBot(comando, remetente);
                    } else if (comando.toLowerCase().startsWith('!addhunted ')) {
                        resposta = await this.processarComandoAddHunted(comando, remetente);
                    } else if (comando.toLowerCase().startsWith('!delhunted ')) {
                        resposta = await this.processarComandoDelHunted(comando, remetente);
                    } else if (comando.toLowerCase() === '!hunteds') {
                        resposta = await this.processarComandoHunteds(comando, remetente);
                    } else if (comando.toLowerCase() === '!huntedalerts on' || comando.toLowerCase() === '!alertas on') {
                        resposta = await this.processarComandoHuntedAlertas(true, remetente);
                    } else if (comando.toLowerCase() === '!huntedalerts off' || comando.toLowerCase() === '!alertas off') {
                        resposta = await this.processarComandoHuntedAlertas(false, remetente);
                    } else if (comando.toLowerCase() === '!huntedalerts' || comando.toLowerCase() === '!alertas') {
                        resposta = await this.processarComandoHuntedAlertasStatus(remetente);
                    } else if (comando.toLowerCase().startsWith('!addfriend ')) {
                        resposta = await this.processarComandoAddFriend(comando, remetente);
                    } else if (comando.toLowerCase().startsWith('!delfriend ')) {
                        resposta = await this.processarComandoDelFriend(comando, remetente);
                    } else if (comando.toLowerCase() === '!friends') {
                        resposta = await this.processarComandoFriends(comando, remetente);
                    } else if (comando.toLowerCase() === '!syncfriends') {
                        resposta = await this.processarComandoSyncFriends(comando, remetente);
                    } else {
                        resposta = `❓ Comando "${comando}" não reconhecido.
💡 Use !help para ver comandos disponíveis.
⚔️ Para respawns: !resp [código] [tempo opcional]
🎯 Para entrar na fila: !next [código]
📋 Para fila: !fila [código]
🚪 Para sair: !leave [código]`;
                    }
                    break;
            }

            // Resposta ultra-rápida
            await this.serverQuery.sendTextMessage(remetente.clid, 1, resposta);
            console.log(`✅ [${timestamp}] Resposta enviada instantaneamente`);

        } catch (error: any) {
            console.log('❌ Erro ao processar comando:', error.message);
            // Tentar enviar erro de volta se possível
            try {
                if (remetente?.clid) {
                    await this.serverQuery.sendTextMessage(remetente.clid, 1, `❌ Erro interno: ${error.message}`);
                }
            } catch (sendError) {
                console.log('❌ Erro adicional ao enviar mensagem de erro:', sendError);
            }
        }
    }

    private async verificarClientesConectados(): Promise<void> {
        try {
            const clients = await this.serverQuery.clientList();
            const realClients = clients.filter((c: any) => c.type === 0); // Apenas clientes reais
            
            console.log(`👥 Clientes conectados detectados: ${realClients.length}`);
            
            if (realClients.length > 0) {
                console.log('✅ Há clientes online - sistema pronto para comandos!');
            } else {
                console.log('ℹ️ Nenhum cliente real online no momento');
            }
        } catch (error: any) {
            console.log('⚠️ Não foi possível verificar clientes:', error.message);
        }
    }

    private configurarHandlersSaida(): void {
        const gracefulShutdown = async (signal: string) => {
            console.log(`\n🛑 Sinal ${signal} recebido, parando sistema otimizado...`);
            await this.parar();
            process.exit(0);
        };

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));
    }

    private iniciarMonitoramentoLeve(): void {
        // Monitoramento de status - a cada 2 minutos
        setInterval(() => {
            if (this.sistemaAtivo) {
                const timestamp = new Date().toLocaleTimeString();
                const uptime = Math.floor(process.uptime() / 60);
                console.log(`💓 Sistema otimizado ativo [${timestamp}] - Uptime: ${uptime}min - ServerQuery: ✅`);
            }
        }, 120000); // 2 minutos

        // Atualização automática do canal Friends - a cada 1 minuto
        setInterval(async () => {
            if (this.sistemaAtivo) {
                try {
                    await this.atualizarCanalFriends();
                    const timestamp = new Date().toLocaleTimeString();
                    console.log(`👥 [${timestamp}] Canal Friends atualizado automaticamente`);
                } catch (error: any) {
                    console.log('⚠️ Erro na atualização automática do canal Friends:', error.message);
                }
            }
        }, 60000); // 1 minuto

        // Atualização automática do canal Claimeds - a cada 30 segundos (apenas se não há timers ativos)
        setInterval(async () => {
            if (this.sistemaAtivo) {
                try {
                    // Só atualizar se não há timers de respawn ativos (para evitar conflito)
                    if (Object.keys(this.timersRespawn).length === 0) {
                        await this.atualizarCanalClaimeds();
                        const timestamp = new Date().toLocaleTimeString();
                        console.log(`⏰ [${timestamp}] Canal Claimeds atualizado automaticamente`);
                    } else {
                        // Timers ativos - sistema de respawn está controlando as atualizações
                        const timestamp = new Date().toLocaleTimeString();
                        console.log(`⏰ [${timestamp}] Canal Claimeds gerenciado por timers ativos`);
                    }
                } catch (error: any) {
                    console.log('⚠️ Erro na atualização automática do canal Claimeds:', error.message);
                }
            }
        }, 30000); // 30 segundos

        // Atualização automática do canal Hunteds - a cada 1 minuto
        setInterval(async () => {
            if (this.sistemaAtivo) {
                try {
                    await this.atualizarCanalHunteds();
                    const timestamp = new Date().toLocaleTimeString();
                    console.log(`🎯 [${timestamp}] Canal Hunteds atualizado automaticamente`);
                } catch (error: any) {
                    console.log('⚠️ Erro na atualização automática do canal Hunteds:', error.message);
                }
            }
        }, 60000); // 1 minuto

        // Monitoramento de mortes - a cada 1 minuto
        setInterval(async () => {
            if (this.sistemaAtivo) {
                try {
                    await this.verificarMortes();
                } catch (error: any) {
                    console.log('⚠️ Erro no monitoramento de mortes:', error.message);
                }
            }
        }, 60000); // 1 minuto

        console.log('🔄 Timers automáticos configurados:');
        console.log('   👥 Friends: A cada 1 minuto');
        console.log('   ⏰ Claimeds: A cada 30 segundos (quando sem timers ativos)');
        console.log('   🎯 Hunteds: A cada 1 minuto');
        console.log('   ⚔️ Respawns & Next: A cada 1 minuto (processo otimizado)');
        console.log('   💀 Mortes: A cada 1 minuto (Friends & Hunteds)');
        console.log('   💓 Status: A cada 2 minutos');
    }

    public async parar(): Promise<void> {
        console.log('🛑 Parando sistema híbrido otimizado...');
        this.sistemaAtivo = false;

        try {
            // Salvar respawns antes de parar
            console.log('💾 Salvando respawns...');
            this.salvarRespawnsPersistidos();
            
            // Limpar timers de respawn
            if (this.intervalTimers) {
                clearInterval(this.intervalTimers);
                this.intervalTimers = null;
                console.log('⏰ Timers de respawn limpos');
            }
            
            // Limpar dados de respawn
            this.timersRespawn = {};
            console.log('🗑️ Dados de respawn limpos');
            
            await this.gerenciadorConexao.resetCompleto();
            console.log('✅ Sistema otimizado parado com sucesso!');
        } catch (error: any) {
            console.log('⚠️ Erro ao parar:', error.message);
        }
    }

    // ===== FUNÇÕES DE ATUALIZAÇÃO DOS CANAIS =====

    private async atualizarCanalFriends(): Promise<void> {
        if (!this.serverQuery) {
            throw new Error('ServerQuery não está conectado');
        }

        try {
            const friendsChannelId = "8"; // ID do canal Friends
            
            // Buscar membros online da guild
            const membrosOnline = await this.buscarMembrosOnlineTibia();
            
            // Construir descrição do canal
            let descricao = `[img]https://i.imgur.com/FtrTAPu.png[/img]

👥 MEMBROS ONLINE - GUILD MISSCLICK 👥
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 Guild Tibia - Players Conectados 🎮

`;

            if (membrosOnline.length === 0) {
                descricao += `😴 Nenhum membro online no momento
🕐 Última verificação: ${new Date().toLocaleString('pt-BR')}
📡 API: TibiaData v4

💡 Esta lista é atualizada automaticamente a cada 1 minuto.
🔄 Sistema busca players online da guild Missclick.
🌐 Fonte: https://api.tibiadata.com/`;
            } else {
                // Agrupar por vocação
                const membrosPorVocacao = this.agruparMembrosPorVocacao(membrosOnline);
                
                descricao += `🟢 ${membrosOnline.length} membro(s) online:\n`;
                
                // Construir lista por vocação
                const vocacoes = ['Knight', 'Paladin', 'Sorcerer', 'Druid', 'Monk'];
                const linhasMembros: string[] = [];
                
                vocacoes.forEach(vocacao => {
                    const membros = membrosPorVocacao[vocacao as keyof typeof membrosPorVocacao];
                    if (membros.length > 0) {
                        linhasMembros.push(`\n🔹 ${vocacao.toUpperCase()}S (${membros.length}):`);
                        
                        membros.forEach((membro: any) => {
                            const level = membro.level || '?';
                            const nome = membro.name || 'Nome não disponível';
                            const vocation = membro.vocation || 'Unknown';
                            
                            const iconeVocacao = this.obterIconeVocacao(vocation);
                            
                            // Formato melhorado: [Ícone] Level Nome (Vocação)
                            linhasMembros.push(`${iconeVocacao} Lv.${level} [b]${nome}[/b]`);
                        });
                    }
                });
                
                descricao += linhasMembros.join('\n');
                
                // Estatísticas adicionais
                const levelMedio = Math.round(membrosOnline.reduce((sum, m) => sum + (m.level || 0), 0) / membrosOnline.length);
                const levelMaisAlto = Math.max(...membrosOnline.map(m => m.level || 0));
                
                descricao += `\n\n📊 [b]ESTATÍSTICAS:[/b]
📈 Level médio: ${levelMedio}
👑 Level mais alto: ${levelMaisAlto}
⏰ Última atualização: ${new Date().toLocaleTimeString('pt-BR')}
🎯 Guild: [b]Missclick[/b] (Tibia)
🤖 Sistema: AliBot 🧙‍♂️
📡 API: TibiaData v4`;
            }
            
            // Verificar se precisa atualizar (evitar spam desnecessário)
            let precisaAtualizar = true;
            try {
                const channelInfo = await this.serverQuery.channelInfo(friendsChannelId);
                const descricaoAtual = (channelInfo as any).channel_description || "";
                
                if (descricaoAtual.trim() === descricao.trim()) {
                    precisaAtualizar = false;
                    console.log(`👥 Canal Friends já está atualizado (${membrosOnline.length} membros) - sem modificações`);
                }
            } catch (error) {
                // Se não conseguir verificar, atualiza mesmo assim
                precisaAtualizar = true;
            }
            
            // Atualizar canal apenas se necessário
            if (precisaAtualizar) {
                await this.serverQuery.channelEdit(friendsChannelId, {
                    channel_description: descricao
                });
                
                console.log(`👥 Canal Friends atualizado: ${membrosOnline.length} membros online da guild Missclick`);
                
                if (membrosOnline.length > 0) {
                    const levelMedio = Math.round(membrosOnline.reduce((sum, m) => sum + (m.level || 0), 0) / membrosOnline.length);
                    console.log(`📊 Estatísticas: Level médio ${levelMedio}, ${membrosOnline.length} players online`);
                }
            }
            
        } catch (error: any) {
            console.log('❌ Erro ao atualizar canal Friends:', error.message);
            throw error;
        }
    }

    private async atualizarCanalClaimeds(): Promise<void> {
        if (!this.serverQuery) {
            throw new Error('ServerQuery não está conectado');
        }

        try {
            const claimedChannelId = "7"; // ID do canal Claimeds
            
            // Construir descrição base do canal
            let descricao = `[img]https://i.imgur.com/6yPB3ol.png[/img]

🎯 SISTEMA DE CLAIMEDS - ALIBOT 🎯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️ Respawns ⚔️
📋 Use: [b]!resp [código] [tempo][/b] - Iniciar timer
🎯 Use: [b]!next [código] [tempo][/b] - Entrar na fila (máx 3 pessoas)
        ⚠️ [i]Tempo mínimo: 01:00 | Incrementos: 15min | Máx: Tier1/2=02:30, Tier3=03:15[/i]
        ⚠️ [i]Obs: Caso não informe tempo, resps Tier 1 e 2  serão 2:30, Tier 3 serão 03:15 por padrão![/i]
🚪 Use: [b]!leave [código][/b] - Sair do respawn
📊 Use: [b]!fila [código][/b] - Ver timer específico
💡 Use: [b]!help[/b] - Lista de comandos

`;

            // Adicionar timers ativos
            const timersAtivos = Object.values(this.timersRespawn);
            const nextAtivos = Object.values(this.nextTimers);
            
            // Combinar timers normais e next timers para exibição
            const todosTimers = [
                ...timersAtivos.map(timer => ({
                    codigo: timer.codigo,
                    nome: timer.nome,
                    jogador: timer.jogador,
                    tempoRestante: timer.tempoRestante,
                    tipo: 'claimed' as const
                })),
                ...nextAtivos.map(nextTimer => {
                    const configRespawns = this.obterConfigRespawns();
                    return {
                        codigo: nextTimer.codigo,
                        nome: `${configRespawns[nextTimer.codigo]} `,
                        jogador: nextTimer.jogador,
                        tempoRestante: nextTimer.tempoRestante,
                        tipo: 'next' as const
                    };
                })
            ];
            
            if (todosTimers.length > 0) {
                descricao += `⏰ CLAIMEDS ATIVOS (${todosTimers.length}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
                
                // Ordenar timers por tempo restante (menor primeiro)
                todosTimers.sort((a, b) => a.tempoRestante - b.tempoRestante);
                
                // Usar for...of para aguardar corretamente as chamadas assíncronas
                for (const timer of todosTimers) {
                    const tempoRestante = this.formatarTempo(timer.tempoRestante);
                    
                    // Para timers normais, verificar se há fila
                    let infoFila = '';
                    if (this.filasClaimeds[timer.codigo] && this.filasClaimeds[timer.codigo].length > 0) {
                        const fila = this.filasClaimeds[timer.codigo];
                        if (fila.length === 1) {
                            const clientId = await this.obterClientIdPorPersonagem(fila[0].jogador);
                            const linkJogador = this.criarLinkJogador(fila[0].jogador, clientId);
                            const tempoInfo = fila[0].tempoDesejado ? ` (${this.formatarTempo(fila[0].tempoDesejado)})` : '';
                            
                            // Se é um next timer, a fila mostra "Fila:", se é claimed normal, mostra "Next:"
                            const labelFila = timer.tipo === 'next' ? 'Fila' : 'Next';
                            infoFila = ` ${labelFila}: ${linkJogador}${tempoInfo}`;
                        } else if (fila.length === 2) {
                            const clientId = await this.obterClientIdPorPersonagem(fila[0].jogador);
                            const linkJogador = this.criarLinkJogador(fila[0].jogador, clientId);
                            const tempoInfo = fila[0].tempoDesejado ? ` (${this.formatarTempo(fila[0].tempoDesejado)})` : '';
                            
                            // Se é um next timer, a fila mostra "Fila:", se é claimed normal, mostra "Next:"
                            const labelFila = timer.tipo === 'next' ? 'Fila' : 'Next';
                            infoFila = ` ${labelFila}: ${linkJogador}${tempoInfo} +1`;
                        }
                    }
                    
                    // Formato com BBCode padrão do TeamSpeak 3
                    const tempoFormatado = `[color=darkorange][b][${tempoRestante}][/b][/color]`;
                    const nomeFormatado = `[b]${timer.nome}[/b]`;
                    
                    // Obter ID do cliente para link clicável (usando nome do personagem)
                    const clientId = await this.obterClientIdPorPersonagem(timer.jogador);
                    const jogadorFormatado = this.criarLinkJogador(timer.jogador, clientId);
                    
                    // Log detalhado sobre o tipo de ID usado
                    const isUniqueId = clientId && !/^\d+$/.test(clientId);
                    console.log(`🔗 Link final para personagem ${timer.jogador}: ${jogadorFormatado} (${isUniqueId ? 'Unique ID' : 'ID numérico'})`);
                    
                    descricao += `${timer.codigo} - ${tempoFormatado}${nomeFormatado}: ${jogadorFormatado}${infoFila}
`;
                }
            }
            
            if (todosTimers.length === 0) {
                // Verificar se há filas ativas mesmo sem timers
                let filasAtivas = '';
                for (const [codigo, fila] of Object.entries(this.filasClaimeds)) {
                    if (fila && fila.length > 0) {
                        const configRespawns = this.obterConfigRespawns();
                        const nomeRespawn = configRespawns[codigo] || `Respawn ${codigo.toUpperCase()}`;
                        
                        filasAtivas += `${codigo} - [b]${nomeRespawn}[/b]: 💤 Livre (Fila: `;
                        
                        for (let i = 0; i < fila.length; i++) {
                            const clientId = await this.obterClientIdPorPersonagem(fila[i].jogador);
                            const linkJogador = this.criarLinkJogador(fila[i].jogador, clientId);
                            const tempoInfo = fila[i].tempoDesejado ? ` (${this.formatarTempo(fila[i].tempoDesejado!)})` : '';
                            
                            if (i > 0) filasAtivas += ', ';
                            filasAtivas += `${linkJogador}${tempoInfo}`;
                        }
                        
                        filasAtivas += ')\n\n';
                    }
                }
                
                if (filasAtivas) {
                    descricao += `⏳ FILAS ATIVAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${filasAtivas}`;
                } else {
                    descricao += `💤 NENHUM TIMER ATIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Use [b]!resp [código] [tempo][/b] para iniciar

`;
                }
            }
            
            descricao += `
🕐 Última atualização: ${new Date().toLocaleTimeString('pt-BR')}
🤖 Sistema: AliBot 🧙‍♂️
⚡ Atualização: Automática a cada minuto`;
            
            // Atualizar canal
            await this.serverQuery.channelEdit(claimedChannelId, {
                channel_description: descricao
            });
            
            const statusTimers = timersAtivos.length > 0 ? `${timersAtivos.length} timers ativos` : 'sem timers';
            console.log(`⏰ Canal Claimeds atualizado (${statusTimers})`);
            
        } catch (error: any) {
            console.log('❌ Erro ao atualizar canal Claimeds:', error.message);
            throw error;
        }
    }

    private async atualizarCanalRespawnsList(): Promise<void> {
        if (!this.serverQuery) {
            throw new Error('ServerQuery não está conectado');
        }

        try {
            const respawnsChannelId = "9"; // ID do canal Respawns List - ESPECÍFICO
            
            console.log('📋 Definindo conteúdo estático do canal Respawns List...');
            
            // Conteúdo ESTÁTICO - apenas a imagem conforme solicitado
            const descricao = `[img]https://i.imgur.com/VhBwi3t.png[/img]`;
            
            // Verificar se precisa atualizar (para evitar atualizações desnecessárias)
            let precisaAtualizar = true;
            try {
                const channelInfo = await this.serverQuery.channelInfo(respawnsChannelId);
                const descricaoAtual = (channelInfo as any).channel_description || "";
                
                if (descricaoAtual.trim() === descricao.trim()) {
                    precisaAtualizar = false;
                    console.log(`📋 Canal Respawns List já possui o conteúdo estático correto - sem modificações`);
                }
            } catch (error) {
                precisaAtualizar = true;
            }
            
            // Atualizar canal apenas se necessário
            if (precisaAtualizar) {
                await this.serverQuery.channelEdit(respawnsChannelId, {
                    channel_description: descricao
                });
                
                console.log(`📋 Canal Respawns List definido com conteúdo estático (apenas imagem)`);
            }
            
        } catch (error: any) {
            console.log('❌ Erro ao definir conteúdo estático do canal Respawns List:', error.message);
            throw error;
        }
    }

    private criarBarraProgresso(progresso: number): string {
        const totalBarras = 10;
        const barrasCompletas = Math.floor((progresso / 100) * totalBarras);
        const barrasVazias = totalBarras - barrasCompletas;
        
        return '[color=green]' + '█'.repeat(barrasCompletas) + '[/color]' + 
               '[color=gray]' + '░'.repeat(barrasVazias) + '[/color]';
    }

    // ===== FUNÇÕES AUXILIARES =====

    private async buscarMembrosOnlineTibia(): Promise<any[]> {
        try {
            const guildName = 'Missclick';
            console.log(`🔍 Buscando membros online da guild "${guildName}" na API do Tibia...`);
            
            const response = await axios.get(`https://api.tibiadata.com/v4/guild/${encodeURIComponent(guildName)}`, {
                timeout: 15000, // 15 segundos de timeout
                headers: {
                    'User-Agent': 'AliBotTS3-Guild-Monitor/1.0'
                }
            });
            
            console.log(`📡 Resposta da API recebida com status: ${response.status}`);
            
            if (response.data && response.data.guild) {
                const guild = response.data.guild;
                console.log(`📊 Guild encontrada: ${guild.name || 'Nome não disponível'}`);
                console.log(`📊 Total de membros: ${guild.members_total || 'N/A'}`);
                console.log(`📊 Online: ${guild.players_online || 'N/A'}, Offline: ${guild.players_offline || 'N/A'}`);
                
                // Na API v4, precisamos filtrar os membros que estão online
                if (guild.members && Array.isArray(guild.members)) {
                    const membrosOnline = guild.members.filter((membro: any) => membro.status === 'online');

                    return membrosOnline;
                } else {
                    console.log('👥 Campo members não encontrado ou não é um array');
                    return [];
                }
            } else {
                console.log('⚠️ Estrutura de resposta da API inesperada');
                console.log('📋 Dados recebidos (primeiros 500 chars):', JSON.stringify(response.data, null, 2).substring(0, 500));
                return [];
            }
            
        } catch (error: any) {
            if (error.code === 'ECONNABORTED') {
                console.log('⏱️ Timeout na conexão com a API do Tibia (15s)');
            } else if (error.response) {
                console.log(`❌ Erro HTTP ${error.response.status}: ${error.response.statusText}`);
                if (error.response.data) {
                    console.log('📋 Resposta do erro:', JSON.stringify(error.response.data, null, 2));
                }
            } else if (error.request) {
                console.log('🌐 Erro de rede - não foi possível conectar à API do Tibia');
            } else {
                console.log('❌ Erro inesperado ao buscar membros online:', error.message);
            }
            
            return [];
        }
    }

    private agruparMembrosPorVocacao(membros: any[]): any {
        const membrosPorVocacao = {
            'Druid': [] as any[],
            'Sorcerer': [] as any[],
            'Knight': [] as any[],
            'Paladin': [] as any[],
            'Monk': [] as any[]
        };

        const categorizarVocacao = (vocation: string): string => {
            const vocacaoLower = vocation.toLowerCase();
            if (vocacaoLower.includes('druid')) return 'Druid';
            if (vocacaoLower.includes('sorcerer')) return 'Sorcerer';
            if (vocacaoLower.includes('knight')) return 'Knight';
            if (vocacaoLower.includes('paladin')) return 'Paladin';
            if (vocacaoLower.includes('monk')) return 'Monk';
            return 'Other';
        };

        membros.forEach((membro: any) => {
            const categoria = categorizarVocacao(membro.vocation || 'Unknown');
            if (membrosPorVocacao[categoria as keyof typeof membrosPorVocacao]) {
                membrosPorVocacao[categoria as keyof typeof membrosPorVocacao].push(membro);
            }
        });

        // Ordenar cada grupo por level
        Object.keys(membrosPorVocacao).forEach(vocacao => {
            membrosPorVocacao[vocacao as keyof typeof membrosPorVocacao].sort((a, b) => (b.level || 0) - (a.level || 0));
        });

        return membrosPorVocacao;
    }

    // ===== SISTEMA DE RESPAWNS/CLAIMEDS =====

    private async processarComandoResp(comando: string, remetente: any): Promise<string> {
        try {
            // Formato: !resp f4 2:30 ou !resp f4 150 (em segundos) OU !resp f4 (para aceitar next com tempo pré-definido)
            const partes = comando.trim().split(' ');
            
            const codigo = partes[1]?.toLowerCase();
            
            // Obter nome do jogador através da descrição
            const infoJogador = await this.obterNomeJogadorPorDescricao(remetente);
            if (!infoJogador.valido) {
                return infoJogador.erro || '❌ Erro ao obter informações do jogador';
            }
            const nomeJogador = infoJogador.nome;
            
            if (!codigo) {
                return `❌ Formato incorreto!
📋 Use: !resp [código] [tempo opcional]
💡 Exemplos:
   !resp a1 (tempo padrão: Tier 1 = 02:30)
   !resp cobra 02:30 (2 horas e 30 minutos)
   !resp f4 01:15 (1 hora e 15 minutos)
   !resp gt (aceitar next com tempo pré-definido)

⏰ Regras de tempo:
   🕐 Mínimo: 01:00 (1 hora)
   📏 Incrementos: 15 minutos (01:00, 01:15, 01:30, etc.)
   🎯 Máximos: Tier 1/2=02:30, Tier 3=03:15`;
            }

            // VERIFICAR SE O CÓDIGO EXISTE NO RESPAWNS-LIST.JSON
            const nomeRespawn = this.obterNomeRespawn(codigo);
            if (!this.respawnsList[codigo.toLowerCase()]) {
                return `❌ Código "${codigo.toUpperCase()}" não encontrado!
📋 Use !listplaces para ver todos os respawns disponíveis
💡 Códigos válidos: ${Object.keys(this.respawnsList).slice(0, 10).join(', ')}${Object.keys(this.respawnsList).length > 10 ? '...' : ''}`;
            }
            
            let tempoParaUsar: number | null = null;
            let ehAceitacaoNext = false;
            
            // VERIFICAR SE É ACEITAÇÃO DE NEXT
            if (this.nextTimers[codigo]) {
                const nextTimer = this.nextTimers[codigo];
                
                // Verificar se é o jogador correto
                if (nextTimer.jogador === nomeJogador) {
                    ehAceitacaoNext = true;
                    
                    // Se tem tempo pré-definido, DEVE usar apenas !resp [codigo] sem especificar tempo
                    if (nextTimer.tempoDesejado) {
                        if (partes.length > 2) {
                            return `❌ Você não pode alterar o tempo pré-definido!
⏰ Tempo pré-definido: ${this.formatarTempo(nextTimer.tempoDesejado)}
📋 Use apenas: !resp ${codigo} (sem especificar tempo)
💡 O tempo já foi definido quando você entrou na fila`;
                        }
                        
                        tempoParaUsar = nextTimer.tempoDesejado;
                        console.log(`✅ Next aceito: ${codigo.toUpperCase()} por ${nomeJogador} - usando tempo pré-definido: ${this.formatarTempo(tempoParaUsar)}`);
                        
                    } else if (!nextTimer.tempoDesejado && partes.length < 3) {
                        return `❌ Você precisa especificar o tempo!
📋 Use: !resp ${codigo} [tempo]
💡 Exemplos:
   !resp ${codigo} 02:30 (2 horas e 30 minutos)
   !resp ${codigo} 01:15 (1 hora e 15 minutos)

⏰ Regras de tempo:
   🕐 Mínimo: 01:00 (1 hora)
   📏 Incrementos: 15 minutos (01:00, 01:15, 01:30, etc.)
   🎯 Máximos: Tier 1/2=02:30, Tier 3=03:15`;
                    } else {
                        // Não tem tempo pré-definido, pode especificar
                        const tempoTexto = partes[2];
                        tempoParaUsar = this.converterTempoParaSegundos(tempoTexto);
                        if (tempoParaUsar === null) {
                            return `❌ Tempo inválido!
💡 Formatos aceitos:
   HH:MM → 00:30 = 30 minutos
   HH:MM:SS → 01:30:45 = 1h30min45s
   SSSS → 150 = 150 segundos`;
                        }

                        // Validar tempo mínimo de 01:00 (3600 segundos)
                        if (tempoParaUsar < 3600) {
                            return `❌ Tempo muito baixo!
⏰ Tempo mínimo: 01:00 (1 hora)
💡 Use formato HH:MM: 01:00, 01:15, 01:30, etc.`;
                        }

                        // Validar incrementos de 15 minutos (900 segundos)
                        if (tempoParaUsar % 900 !== 0) {
                            return `❌ Tempo deve ser em incrementos de 15 minutos!
⏰ Exemplos válidos: 01:00, 01:15, 01:30, 01:45, 02:00, 02:15, etc.
💡 Use apenas horários que sejam múltiplos de 15 minutos`;
                        }

                        // Validar tempo máximo baseado no tier
                        const nomeRespawn = this.obterNomeRespawn(codigo).toLowerCase();
                        let tempoMaximo: number;
                        let tierInfo: string;

                        if (nomeRespawn.includes('tier 3')) {
                            tempoMaximo = 11700; // 03:15
                            tierInfo = "Tier 3 (máx: 03:15)";
                        } else if (nomeRespawn.includes('tier 1') || nomeRespawn.includes('tier 2')) {
                            tempoMaximo = 9000; // 02:30
                            tierInfo = "Tier 1/2 (máx: 02:30)";
                        } else {
                            tempoMaximo = 9000; // 02:30 (padrão)
                            tierInfo = "Padrão (máx: 02:30)";
                        }

                        if (tempoParaUsar > tempoMaximo) {
                            return `❌ Tempo muito alto para este respawn!
⚔️ ${this.obterNomeRespawn(codigo)} (${codigo.toUpperCase()})
🎯 ${tierInfo}
⏰ Tempo solicitado: ${this.formatarTempo(tempoParaUsar)}
💡 Reduza o tempo ou use o padrão sem especificar tempo`;
                        }

                        console.log(`✅ Next aceito: ${codigo.toUpperCase()} por ${nomeJogador} - tempo especificado: ${this.formatarTempo(tempoParaUsar)}`);
                    }
                    
                    // Remover timer de next
                    delete this.nextTimers[codigo];
                    
                } else {
                    return `❌ Este claimed está aguardando ${nextTimer.jogador} aceitar!
⏰ Tempo restante para aceitação: ${this.formatarTempo(nextTimer.tempoRestante)}
🎯 Apenas ${nextTimer.jogador} pode aceitar agora`;
                }
            } else {
                // Não é aceitação de next, comando normal
                if (partes.length < 3) {
                    // Se não especificou tempo, usar tempo padrão baseado no tier
                    tempoParaUsar = this.obterTempopadrao(codigo);
                    console.log(`⏰ Tempo padrão aplicado para ${codigo.toUpperCase()}: ${this.formatarTempo(tempoParaUsar)} (baseado no tier)`);
                } else {
                    // Jogador especificou tempo
                    const tempoTexto = partes[2];
                    tempoParaUsar = this.converterTempoParaSegundos(tempoTexto);
                    if (tempoParaUsar === null) {
                        return `❌ Tempo inválido!
💡 Formatos aceitos:
   HH:MM → 00:30 = 30 minutos
   HH:MM:SS → 01:30:45 = 1h30min45s
   SSSS → 150 = 150 segundos`;
                    }

                    // Validar tempo mínimo de 01:00 (3600 segundos)
                    if (tempoParaUsar < 3600) {
                        return `❌ Tempo muito baixo!
⏰ Tempo mínimo: 01:00 (1 hora)
💡 Use formato HH:MM: 01:00, 01:15, 01:30, etc.`;
                    }

                    // Validar incrementos de 15 minutos (900 segundos)
                    if (tempoParaUsar % 900 !== 0) {
                        return `❌ Tempo deve ser em incrementos de 15 minutos!
⏰ Exemplos válidos: 01:00, 01:15, 01:30, 01:45, 02:00, 02:15, etc.
💡 Use apenas horários que sejam múltiplos de 15 minutos`;
                    }

                    // Validar tempo máximo baseado no tier
                    const nomeRespawn = this.obterNomeRespawn(codigo).toLowerCase();
                    let tempoMaximo: number;
                    let tierInfo: string;

                    if (nomeRespawn.includes('tier 3')) {
                        tempoMaximo = 11700; // 03:15
                        tierInfo = "Tier 3 (máx: 03:15)";
                    } else if (nomeRespawn.includes('tier 1') || nomeRespawn.includes('tier 2')) {
                        tempoMaximo = 9000; // 02:30
                        tierInfo = "Tier 1/2 (máx: 02:30)";
                    } else {
                        tempoMaximo = 9000; // 02:30 (padrão)
                        tierInfo = "Padrão (máx: 02:30)";
                    }

                    if (tempoParaUsar > tempoMaximo) {
                        return `❌ Tempo muito alto para este respawn!
⚔️ ${this.obterNomeRespawn(codigo)} (${codigo.toUpperCase()})
🎯 ${tierInfo}
⏰ Tempo solicitado: ${this.formatarTempo(tempoParaUsar)}
💡 Reduza o tempo ou use o padrão sem especificar tempo`;
                    }
                }
            }
            
            // Verificar se já existe timer ativo (e não é aceitação de next)
            if (this.timersRespawn[codigo] && !ehAceitacaoNext) {
                const timerAtivo = this.timersRespawn[codigo];
                return `❌ Respawn já tem claimed ativo!
⚔️ ${timerAtivo.nome} (${codigo.toUpperCase()})
👤 Jogador: ${timerAtivo.jogador}
⏰ Tempo restante: ${this.formatarTempo(timerAtivo.tempoRestante)}

💡 Opções disponíveis:
🔄 Use !next ${codigo} [tempo] para entrar na fila
📋 Use !claimeds para ver todos os ativos`;
            }

            // Criar timer
            const timer: RespawnTimer = {
                codigo: codigo,
                nome: this.obterNomeRespawn(codigo),
                jogador: nomeJogador,
                tempoRestante: tempoParaUsar!,
                iniciadoEm: new Date(),
                duracaoTotal: tempoParaUsar!,
                ultimoMinutoProcessado: 0
            };

            this.timersRespawn[codigo] = timer;
            
            // Iniciar sistema de contagem se não estiver ativo
            if (!this.intervalTimers) {
                this.iniciarSistemaTimers();
            }

            // Atualizar canal Claimeds imediatamente
            await this.atualizarCanalClaimeds();

            const tempoFormatado = this.formatarTempo(tempoParaUsar!);
            const tipoAceitacao = ehAceitacaoNext ? ' (Next aceito!)' : '';
            const tipoTempo = (partes.length < 3 && !ehAceitacaoNext) ? ' (Tempo padrão aplicado)' : '';
            
            return `✅ Timer iniciado!${tipoAceitacao}${tipoTempo}
⚔️ Respawn: ${timer.nome} (${codigo.toUpperCase()})
⏰ Tempo: ${tempoFormatado}
👤 Jogador: ${timer.jogador}
🔄 Canal Claimeds atualizado automaticamente`;

        } catch (error: any) {
            return `❌ Erro ao processar comando !resp: ${error.message}`;
        }
    }

    private converterTempoParaSegundos(tempoTexto: string): number | null {
        let segundos = 0;
        
        if (tempoTexto.includes(':')) {
            // Formato HH:MM (hora:minuto) ou HH:MM:SS (hora:minuto:segundo)
            const tempoParts = tempoTexto.split(':').map(p => parseInt(p));
            if (tempoParts.length === 2) {
                // HH:MM - hora:minuto
                segundos = tempoParts[0] * 3600 + tempoParts[1] * 60;
            } else if (tempoParts.length === 3) {
                // HH:MM:SS - hora:minuto:segundo
                segundos = tempoParts[0] * 3600 + tempoParts[1] * 60 + tempoParts[2];
            }
        } else {
            // Formato em segundos direto
            segundos = parseInt(tempoTexto);
        }

        if (isNaN(segundos) || segundos <= 0) {
            return null;
        }
        
        return segundos;
    }

    private async processarComandoLeave(comando: string, remetente: any): Promise<string> {
        try {
            const partes = comando.trim().split(' ');
            
            if (partes.length < 2) {
                return `❌ Formato incorreto!
📋 Use: !leave [código]
💡 Exemplo: !leave f4`;
            }

            const codigo = partes[1].toLowerCase();
            
            // Obter nome do jogador através da descrição
            const infoJogador = await this.obterNomeJogadorPorDescricao(remetente);
            if (!infoJogador.valido) {
                return infoJogador.erro || '❌ Erro ao obter informações do jogador';
            }
            const nomeJogador = infoJogador.nome;
            
            // Verificar se o código existe na configuração
            const configRespawns = this.obterConfigRespawns();
            if (!configRespawns[codigo]) {
                return `❌ Código "${codigo.toUpperCase()}" não existe!
📋 Use !help para ver códigos disponíveis`;
            }

            let encontrouJogador = false;
            let tipoRemocao = '';
            let mensagemSucesso = '';

            // 1. Verificar se está no timer ativo
            if (this.timersRespawn[codigo]) {
                const timer = this.timersRespawn[codigo];
                if (timer.jogador === nomeJogador) {
                    // Remover timer ativo
                    delete this.timersRespawn[codigo];
                    encontrouJogador = true;
                    tipoRemocao = 'timer';
                    mensagemSucesso = `✅ Você saiu do respawn **${configRespawns[codigo]}**!`;
                    
                    // Verificar se há próximo na fila para assumir
                    if (this.filasClaimeds[codigo] && this.filasClaimeds[codigo].length > 0) {
                        const proximoJogador = this.filasClaimeds[codigo][0];
                        
                        // Remover da fila
                        this.filasClaimeds[codigo].shift();
                        
                        // Criar next timer para o próximo
                        this.nextTimers[codigo] = {
                            codigo: codigo,
                            jogador: proximoJogador.jogador,
                            tempoRestante: 600, // 10 minutos para aceitar
                            iniciadoEm: new Date(),
                            tempoDesejado: proximoJogador.tempoDesejado,
                            ultimoMinutoProcessado: 0
                        };
                        
                        mensagemSucesso += ` Próximo da fila foi notificado.`;
                        
                        // Enviar poke para o próximo jogador
                        await this.enviarPokeNextIniciado(proximoJogador.jogador, codigo);
                    }
                }
            }

            // 2. Verificar se está no next timer (aguardando aceitar)
            if (!encontrouJogador && this.nextTimers[codigo]) {
                const nextTimer = this.nextTimers[codigo];
                if (nextTimer.jogador === nomeJogador) {
                    // Remover next timer
                    delete this.nextTimers[codigo];
                    encontrouJogador = true;
                    tipoRemocao = 'next';
                    mensagemSucesso = `✅ Você saiu do next timer **${configRespawns[codigo]}**!`;
                    
                    // Verificar se há próximo na fila
                    if (this.filasClaimeds[codigo] && this.filasClaimeds[codigo].length > 0) {
                        const proximoJogador = this.filasClaimeds[codigo][0];
                        
                        // Remover da fila
                        this.filasClaimeds[codigo].shift();
                        
                        // Criar novo next timer para o próximo
                        this.nextTimers[codigo] = {
                            codigo: codigo,
                            jogador: proximoJogador.jogador,
                            tempoRestante: 600, // 10 minutos para aceitar
                            iniciadoEm: new Date(),
                            tempoDesejado: proximoJogador.tempoDesejado,
                            ultimoMinutoProcessado: 0
                        };
                        
                        mensagemSucesso += ` Próximo da fila assumiu.`;
                        
                        // Enviar poke para o próximo jogador
                        await this.enviarPokeNextIniciado(proximoJogador.jogador, codigo);
                    }
                }
            }

            // 3. Verificar se está na fila
            if (!encontrouJogador && this.filasClaimeds[codigo] && this.filasClaimeds[codigo].length > 0) {
                const indiceJogador = this.filasClaimeds[codigo].findIndex(item => item.jogador === nomeJogador);
                if (indiceJogador !== -1) {
                    // Remover da fila
                    this.filasClaimeds[codigo].splice(indiceJogador, 1);
                    encontrouJogador = true;
                    tipoRemocao = 'fila';
                    mensagemSucesso = `✅ Você foi removido da fila **${configRespawns[codigo]}**!`;
                    
                    // Reajustar posições na fila
                    this.filasClaimeds[codigo].forEach((item, index) => {
                        item.posicao = index + 1;
                    });
                }
            }

            if (!encontrouJogador) {
                return `❌ Você não está participando do respawn **${configRespawns[codigo]}**!
� Use !fila ${codigo} para ver o status atual`;
            }

            // Atualizar canal
            await this.atualizarCanalClaimeds();

            return mensagemSucesso + `
🔄 Canal Claimeds atualizado`;

        } catch (error: any) {
            console.log('❌ Erro no comando leave:', error.message);
            return `❌ Erro interno: ${error.message}`;
        }
    }

    private async processarComandoNext(comando: string, remetente: any): Promise<string> {
        try {
            const partes = comando.trim().split(' ');
            
            if (partes.length < 2 || partes.length > 3) {
                return `❌ Formato incorreto!
📋 Use: !next [código] [tempo opcional]
💡 Exemplos: 
   !next f4 (tempo padrão: Tier 1/2=02:30, Tier 3=03:15)
   !next f4 02:30 (com tempo de 2h30min)
   !next a3 01:15 (com tempo de 1h15min)
   
⏰ Regras de tempo:
   🕐 Mínimo: 01:00 (1 hora)
   📏 Incrementos: 15 minutos (01:00, 01:15, 01:30, etc.)
   🎯 Máximos: Tier 1/2=02:30, Tier 3=03:15
   👥 Fila máxima: 3 pessoas`;
            }

            const codigo = partes[1].toLowerCase();
            
            // Verificar se o código existe na configuração
            const configRespawns = this.obterConfigRespawns();
            if (!configRespawns[codigo]) {
                return `❌ Código "${codigo.toUpperCase()}" não existe!
📋 Use !help para ver códigos disponíveis`;
            }
            
            // VERIFICAR SE HÁ TIMER ATIVO OU NEXT TIMER PARA ESTE CÓDIGO
            const temTimerAtivo = this.timersRespawn[codigo] || this.nextTimers[codigo];
            if (!temTimerAtivo) {
                return `❌ Não há timer ativo para este respawn!
📋 Use: !resp ${codigo.toUpperCase()} [tempo] para iniciar um timer
💡 O comando !next só pode ser usado quando há um claimed ativo`;
            }
            
            // Obter nome do jogador através da descrição
            const infoJogador = await this.obterNomeJogadorPorDescricao(remetente);
            if (!infoJogador.valido) {
                return infoJogador.erro || '❌ Erro ao obter informações do jogador';
            }
            const nomeJogador = infoJogador.nome;
            
            // Processar tempo desejado se especificado
            let tempoDesejado: number | undefined = undefined;
            if (partes.length === 3) {
                const tempoTexto = partes[2];
                
                // Converter tempo para segundos
                let segundos = 0;
                if (tempoTexto.includes(':')) {
                    // Formato HH:MM (hora:minuto) ou HH:MM:SS (hora:minuto:segundo)
                    const tempoParts = tempoTexto.split(':').map(p => parseInt(p));
                    if (tempoParts.length === 2) {
                        // HH:MM - hora:minuto
                        segundos = tempoParts[0] * 3600 + tempoParts[1] * 60;
                    } else if (tempoParts.length === 3) {
                        // HH:MM:SS - hora:minuto:segundo
                        segundos = tempoParts[0] * 3600 + tempoParts[1] * 60 + tempoParts[2];
                    }
                } else {
                    // Formato em segundos direto
                    segundos = parseInt(tempoTexto);
                }

                if (isNaN(segundos) || segundos <= 0) {
                    return `❌ Tempo inválido!
💡 Formatos aceitos:
   HH:MM → 00:30 = 30 minutos
   HH:MM:SS → 01:30:45 = 1h30min45s
   SSSS → 150 = 150 segundos`;
                }

                // Validar tempo mínimo de 01:00 (3600 segundos)
                if (segundos < 3600) {
                    return `❌ Tempo muito baixo!
⏰ Tempo mínimo: 01:00 (1 hora)
💡 Use formato HH:MM: 01:00, 01:15, 01:30, etc.`;
                }

                // Validar incrementos de 15 minutos (900 segundos)
                if (segundos % 900 !== 0) {
                    return `❌ Tempo deve ser em incrementos de 15 minutos!
⏰ Exemplos válidos: 01:00, 01:15, 01:30, 01:45, 02:00, 02:15, etc.
💡 Use apenas horários que sejam múltiplos de 15 minutos`;
                }

                // Validar tempo máximo baseado no tier
                const nomeRespawn = this.obterNomeRespawn(codigo).toLowerCase();
                let tempoMaximo: number;
                let tierInfo: string;

                if (nomeRespawn.includes('tier 3')) {
                    tempoMaximo = 11700; // 03:15
                    tierInfo = "Tier 3 (máx: 03:15)";
                } else if (nomeRespawn.includes('tier 1') || nomeRespawn.includes('tier 2')) {
                    tempoMaximo = 9000; // 02:30
                    tierInfo = "Tier 1/2 (máx: 02:30)";
                } else {
                    tempoMaximo = 9000; // 02:30 (padrão)
                    tierInfo = "Padrão (máx: 02:30)";
                }

                if (segundos > tempoMaximo) {
                    return `❌ Tempo muito alto para este respawn!
⚔️ ${configRespawns[codigo]} (${codigo.toUpperCase()})
🎯 ${tierInfo}
⏰ Tempo solicitado: ${this.formatarTempo(segundos)}
💡 Reduza o tempo ou use o padrão sem especificar tempo`;
                }
                
                tempoDesejado = segundos;
            } else {
                // Se não especificou tempo, usar tempo padrão baseado no tier
                tempoDesejado = this.obterTempopadrao(codigo);
                console.log(`⏰ Tempo padrão aplicado para !next ${codigo.toUpperCase()}: ${this.formatarTempo(tempoDesejado)} (baseado no tier)`);
            }
            
            // Verificar se já está no timer atual
            if (this.timersRespawn[codigo]) {
                if (this.timersRespawn[codigo].jogador === nomeJogador) {
                    return `❌ Você já está com este respawn ativo!
⚔️ ${configRespawns[codigo]} (${codigo.toUpperCase()})`;
                }
            }

            // Verificar se já está no next timer (aguardando aceitar)
            if (this.nextTimers[codigo]) {
                if (this.nextTimers[codigo].jogador === nomeJogador) {
                    return `❌ Você já está aguardando aceitar este respawn!
⚔️ ${configRespawns[codigo]} (${codigo.toUpperCase()})
⏰ Tempo para aceitar: ${this.formatarTempo(this.nextTimers[codigo].tempoRestante)}
💡 Use !resp ${codigo} para aceitar`;
                }
            }

            // Verificar se já está na fila
            if (!this.filasClaimeds[codigo]) {
                this.filasClaimeds[codigo] = [];
            }

            const jaEstaNaFila = this.filasClaimeds[codigo].some(item => item.jogador === nomeJogador);
            if (jaEstaNaFila) {
                const posicao = this.filasClaimeds[codigo].findIndex(item => item.jogador === nomeJogador) + 1;
                return `❌ Você já está na fila!
🎯 Posição: ${posicao}/${this.filasClaimeds[codigo].length}
⚔️ ${configRespawns[codigo]} (${codigo.toUpperCase()})`;
            }

            // LIMITAR FILA A 3 NEXTS
            if (this.filasClaimeds[codigo].length >= 3) {
                return `❌ Fila lotada!
🎯 Máximo: 3 nexts por claimed
⚔️ ${configRespawns[codigo]} (${codigo.toUpperCase()})
📋 Use !fila ${codigo} para ver a fila atual`;
            }

            // Adicionar à fila
            const novaFila: FilaItem = {
                jogador: nomeJogador,
                posicao: this.filasClaimeds[codigo].length + 1,
                adicionadoEm: new Date(),
                tempoDesejado: tempoDesejado // Armazenar tempo desejado
            };

            this.filasClaimeds[codigo].push(novaFila);

            // Atualizar canal
            await this.atualizarCanalClaimeds();

            const timerAtivo = this.timersRespawn[codigo];
            const statusAtual = timerAtivo ? `⏰ Timer atual: ${this.formatarTempo(timerAtivo.tempoRestante)} (${timerAtivo.jogador})` : '💤 Nenhum timer ativo';
            
            // Informar sobre tempo que será usado
            const infoTempo = partes.length === 3 ? 
                `⏰ Tempo definido: ${this.formatarTempo(tempoDesejado!)}` :
                `⏰ Tempo padrão (baseado no tier): ${this.formatarTempo(tempoDesejado!)}`;

            return `✅ Adicionado à fila!
🎯 Posição: ${novaFila.posicao}/${this.filasClaimeds[codigo].length}
⚔️ ${configRespawns[codigo]} (${codigo.toUpperCase()})
${infoTempo}
${statusAtual}
🔄 Canal Claimeds atualizado

💡 Quando for sua vez, use apenas [b]!resp[/b] para aceitar com o tempo configurado`;

        } catch (error: any) {
            console.log('❌ Erro no comando next:', error.message);
            return `❌ Erro interno: ${error.message}`;
        }
    }

    private async processarComandoFila(comando: string, remetente: any): Promise<string> {
        try {
            const partes = comando.trim().split(' ');
            
            if (partes.length >= 2) {
                // Ver fila específica
                const codigo = partes[1].toLowerCase();
                const timer = this.timersRespawn[codigo];
                
                if (!timer) {
                    return `❌ Nenhum timer ativo para "${codigo.toUpperCase()}"
📋 Use !fila para ver todos os timers`;
                }

                const tempoRestante = this.formatarTempo(timer.tempoRestante);
                const tempoTotal = this.formatarTempo(timer.duracaoTotal);
                const progresso = Math.round(((timer.duracaoTotal - timer.tempoRestante) / timer.duracaoTotal) * 100);

                return `⚔️ ${timer.nome} (${codigo.toUpperCase()})
👤 Jogador: ${timer.jogador}
⏰ Restante: ${tempoRestante}
📊 Total: ${tempoTotal}
📈 Progresso: ${progresso}%
🕐 Iniciado: ${timer.iniciadoEm.toLocaleTimeString('pt-BR')}`;
            } else {
                // Ver todas as filas
                const timersAtivos = Object.values(this.timersRespawn);
                
                if (timersAtivos.length === 0) {
                    return `📋 Nenhum timer ativo no momento
💡 Use !resp [código] [tempo] para iniciar um timer`;
                }

                let resposta = `📋 Timers ativos (${timersAtivos.length}):\n\n`;
                
                timersAtivos.forEach(timer => {
                    const tempoRestante = this.formatarTempo(timer.tempoRestante);
                    resposta += `⚔️ ${timer.codigo.toUpperCase()}: ${timer.nome}
👤 ${timer.jogador} - ⏰ ${tempoRestante}\n\n`;
                });

                return resposta.trim();
            }

        } catch (error: any) {
            return `❌ Erro ao processar comando !fila: ${error.message}`;
        }
    }

    private iniciarSistemaTimers(): void {
        console.log('⏰ Iniciando sistema de timers de respawn...');
        
        this.intervalTimers = setInterval(async () => {
            try {
                let timerExpirou = false;
                let atualizacaoNecessaria = false;
                const agora = Date.now();
                
                // Atualizar todos os timers de respawn - contagem individual no minuto exato
                for (const codigo in this.timersRespawn) {
                    const timer = this.timersRespawn[codigo];
                    
                    // Calcular quantos minutos se passaram desde o início
                    const tempoDecorridoMs = agora - timer.iniciadoEm.getTime();
                    const minutosDecorridos = Math.floor(tempoDecorridoMs / 60000);
                    
                    // Só decrementar se passou um novo minuto completo
                    if (minutosDecorridos > timer.ultimoMinutoProcessado) {
                        const minutosParaDecrementar = minutosDecorridos - timer.ultimoMinutoProcessado;
                        timer.tempoRestante -= (minutosParaDecrementar * 60);
                        timer.ultimoMinutoProcessado = minutosDecorridos;
                        atualizacaoNecessaria = true;
                        
                        console.log(`⏱️ Timer ${codigo.toUpperCase()}: decrementado ${minutosParaDecrementar} minuto(s) - restam ${this.formatarTempo(timer.tempoRestante)}`);
                    }
                    
                    if (timer.tempoRestante <= 0) {
                        console.log(`⚔️ Timer expirado: ${timer.nome} (${codigo.toUpperCase()}) - ${timer.jogador}`);
                        
                        // ENVIAR POKE para o jogador avisando que o tempo expirou
                        await this.enviarPokeExpiracao(timer.jogador, codigo, timer.nome);
                        
                        delete this.timersRespawn[codigo];
                        timerExpirou = true;
                        
                        // Verificar se há fila para este claimed
                        await this.processarFilaAposExpiracao(codigo);
                    }
                }

                // Atualizar timers de next - contagem individual no minuto exato
                for (const codigo in this.nextTimers) {
                    const nextTimer = this.nextTimers[codigo];
                    
                    // Calcular quantos minutos se passaram desde o início
                    const tempoDecorridoMs = agora - nextTimer.iniciadoEm.getTime();
                    const minutosDecorridos = Math.floor(tempoDecorridoMs / 60000);
                    
                    // Só decrementar se passou um novo minuto completo
                    if (minutosDecorridos > nextTimer.ultimoMinutoProcessado) {
                        const minutosParaDecrementar = minutosDecorridos - nextTimer.ultimoMinutoProcessado;
                        nextTimer.tempoRestante -= (minutosParaDecrementar * 60);
                        nextTimer.ultimoMinutoProcessado = minutosDecorridos;
                        atualizacaoNecessaria = true;
                        
                        console.log(`⏱️ Next Timer ${codigo.toUpperCase()}: decrementado ${minutosParaDecrementar} minuto(s) - restam ${this.formatarTempo(nextTimer.tempoRestante)}`);
                    }
                    
                    if (nextTimer.tempoRestante <= 0) {
                        console.log(`⏰ Timer de next expirado: ${codigo.toUpperCase()} - ${nextTimer.jogador} não aceitou`);
                        
                        // ENVIAR POKE para o jogador avisando que não aceitou a tempo
                        await this.enviarPokeNextExpirado(nextTimer.jogador, codigo);
                        
                        delete this.nextTimers[codigo];
                        atualizacaoNecessaria = true;
                        
                        // Passar para o próximo da fila
                        await this.processarProximoNaFila(codigo);
                    }
                }
                
                // Atualizar canal apenas quando necessário
                if (atualizacaoNecessaria) {
                    console.log(`⏰ Atualizando canal Claimeds (${Object.keys(this.timersRespawn).length} timers + ${Object.keys(this.nextTimers).length} nexts)`);
                    await this.atualizarCanalClaimeds();
                }
                
                // Parar sistema se não há mais timers
                if (Object.keys(this.timersRespawn).length === 0 && Object.keys(this.nextTimers).length === 0) {
                    console.log('⏰ Nenhum timer ativo - pausando sistema de timers');
                    if (this.intervalTimers) {
                        clearInterval(this.intervalTimers);
                        this.intervalTimers = null;
                    }
                }
                
            } catch (error: any) {
                console.log('❌ Erro no sistema de timers:', error.message);
            }
        }, 15000); // Verificar a cada 15 segundos para detectar novos minutos rapidamente
    }

    private async processarFilaAposExpiracao(codigo: string): Promise<void> {
        try {
            // Verificar se há fila para este claimed
            if (this.filasClaimeds[codigo] && this.filasClaimeds[codigo].length > 0) {
                const proximoJogador = this.filasClaimeds[codigo][0]; // Primeiro da fila
                
                // Remover o jogador da fila (ele agora assume o claimed)
                this.filasClaimeds[codigo].shift();
                
                // CRIAR TIMER DE NEXT DIRETAMENTE (10 minutos para aceitar)
                this.nextTimers[codigo] = {
                    codigo: codigo,
                    jogador: proximoJogador.jogador,
                    tempoRestante: 600, // 10 minutos = 600 segundos
                    iniciadoEm: new Date(),
                    tempoDesejado: proximoJogador.tempoDesejado, // Passar tempo desejado
                    ultimoMinutoProcessado: 0
                };

                // Iniciar sistema de contagem se não estiver ativo
                if (!this.intervalTimers) {
                    this.iniciarSistemaTimers();
                }
                
                const infoTempo = proximoJogador.tempoDesejado ? 
                    ` (tempo pré-definido: ${this.formatarTempo(proximoJogador.tempoDesejado)})` : 
                    ' (escolher tempo ao aceitar)';
                
                console.log(`🎯 Next assumiu posição: ${codigo.toUpperCase()} para ${proximoJogador.jogador} (10 min para aceitar)${infoTempo}`);
                
                // ENVIAR POKE para o jogador avisando que seu next começou
                await this.enviarPokeNextIniciado(proximoJogador.jogador, codigo);
                
                // Atualizar canal
                await this.atualizarCanalClaimeds();
                
            } else {
                console.log(`💤 Nenhuma fila para ${codigo.toUpperCase()} - claimed livre`);
            }
        } catch (error: any) {
            console.log(`❌ Erro ao processar fila após expiração (${codigo}):`, error.message);
        }
    }

    private async processarProximoNaFila(codigo: string): Promise<void> {
        try {
            // O jogador que não aceitou o next timer NÃO estava na fila
            // Apenas verificar se há alguém na fila para assumir
            if (this.filasClaimeds[codigo] && this.filasClaimeds[codigo].length > 0) {
                const proximoJogador = this.filasClaimeds[codigo][0]; // Primeiro da fila
                
                // Remover o próximo jogador da fila (ele vai virar next timer)
                this.filasClaimeds[codigo].shift();
                
                console.log(`🎯 Próximo da fila assumindo: ${proximoJogador.jogador} para ${codigo.toUpperCase()}`);
                
                // Criar novo timer de next para o próximo
                this.nextTimers[codigo] = {
                    codigo: codigo,
                    jogador: proximoJogador.jogador,
                    tempoRestante: 600, // 10 minutos = 600 segundos
                    iniciadoEm: new Date(),
                    tempoDesejado: proximoJogador.tempoDesejado, // Passar tempo desejado
                    ultimoMinutoProcessado: 0
                };

                // Iniciar sistema de contagem se não estiver ativo
                if (!this.intervalTimers) {
                    this.iniciarSistemaTimers();
                }
                
                const infoTempo = proximoJogador.tempoDesejado ? 
                    ` (tempo pré-definido: ${this.formatarTempo(proximoJogador.tempoDesejado)})` : 
                    ' (escolher tempo ao aceitar)';
                
                console.log(`🎯 Próximo da fila: ${codigo.toUpperCase()} para ${proximoJogador.jogador} (10 min para aceitar)${infoTempo}`);
                
                // ENVIAR POKE para o próximo jogador
                await this.enviarPokeNextIniciado(proximoJogador.jogador, codigo);
            } else {
                console.log(`💤 Fila vazia para ${codigo.toUpperCase()} - claimed livre`);
            }
            
            // Atualizar canal
            await this.atualizarCanalClaimeds();
        } catch (error: any) {
            console.log(`❌ Erro ao processar próximo na fila (${codigo}):`, error.message);
        }
    }

    private async enviarPokeExpiracao(nomeJogador: string, codigo: string, nomeRespawn: string): Promise<void> {
        try {
            console.log(`🔍 Buscando cliente para poke: ${nomeJogador}`);
            
            // Buscar o cliente pela descrição (nome do personagem)
            const cliente = await this.buscarClientePorDescricao(nomeJogador);
            if (cliente) {
                const mensagem = `[color=red]⏰ SEU TIMER EXPIROU! ${codigo.toUpperCase()} - ${nomeRespawn}[/color]`;
                
                // Tentar poke (clientpoke)
                await this.serverQuery.clientPoke(cliente.clid, mensagem);
                console.log(`📢 Poke enviado para ${nomeJogador} (Cliente: ${cliente.clientNickname}, ID: ${cliente.clid}): Timer ${codigo.toUpperCase()} expirou`);
            } else {
                console.log(`❌ Cliente com personagem ${nomeJogador} não encontrado para poke de expiração`);
                
                // Log dos clientes conectados para debug
                const clientes = await this.serverQuery.clientList();
                console.log(`👥 Clientes online:`, clientes.map((c: any) => c.clientNickname || c.nickname).join(', '));
            }
        } catch (error: any) {
            console.log(`❌ Erro ao enviar poke de expiração para ${nomeJogador}:`, error.message);
        }
    }

    private async enviarPokeNextIniciado(nomeJogador: string, codigo: string): Promise<void> {
        try {
            console.log(`🔍 Buscando cliente para poke de next: ${nomeJogador}`);
            
            // Buscar o cliente pela descrição (nome do personagem)
            const cliente = await this.buscarClientePorDescricao(nomeJogador);
            if (cliente) {
                const configRespawns = this.obterConfigRespawns();
                
                // Verificar se há tempo pré-definido
                const nextTimer = this.nextTimers[codigo];
                let mensagem = '';
                
                if (nextTimer && nextTimer.tempoDesejado) {
                    mensagem = `[color=green]🎯 VOCÊ ASSUMIU O CLAIMED! ${codigo.toUpperCase()} - ${configRespawns[codigo]} | Use apenas !resp ${codigo} nos próximos 10 minutos para aceitar com tempo pré-definido: ${this.formatarTempo(nextTimer.tempoDesejado)}[/color]`;
                } else {
                    mensagem = `[color=green]🎯 VOCÊ ASSUMIU O CLAIMED! ${codigo.toUpperCase()} - ${configRespawns[codigo]} | Use !resp ${codigo} [tempo] nos próximos 10 minutos para confirmar[/color]`;
                }
                
                // Tentar poke (clientpoke)
                await this.serverQuery.clientPoke(cliente.clid, mensagem);
                console.log(`📢 Poke enviado para ${nomeJogador} (Cliente: ${cliente.clientNickname}, ID: ${cliente.clid}): Assumiu claimed ${codigo.toUpperCase()}`);
            } else {
                console.log(`❌ Cliente com personagem ${nomeJogador} não encontrado para poke de next`);
                
                // Log dos clientes conectados para debug
                const clientes = await this.serverQuery.clientList();
                console.log(`👥 Clientes online:`, clientes.map((c: any) => c.clientNickname || c.nickname).join(', '));
            }
        } catch (error: any) {
            console.log(`❌ Erro ao enviar poke de next para ${nomeJogador}:`, error.message);
        }
    }

    private async enviarPokeNextExpirado(nomeJogador: string, codigo: string): Promise<void> {
        try {
            console.log(`🔍 Buscando cliente para poke de next expirado: ${nomeJogador}`);
            
            // Buscar o cliente pela descrição (nome do personagem)
            const cliente = await this.buscarClientePorDescricao(nomeJogador);
            if (cliente) {
                const mensagem = `[color=red]❌ SEU NEXT EXPIROU! ${codigo.toUpperCase()} - Você não aceitou a tempo e foi removido da fila[/color]`;
                
                // Tentar poke (clientpoke)
                await this.serverQuery.clientPoke(cliente.clid, mensagem);
                console.log(`📢 Poke enviado para ${nomeJogador} (Cliente: ${cliente.clientNickname}, ID: ${cliente.clid}): Next ${codigo.toUpperCase()} expirado`);
            } else {
                console.log(`❌ Cliente com personagem ${nomeJogador} não encontrado para poke de next expirado`);
                
                // Log dos clientes conectados para debug
                const clientes = await this.serverQuery.clientList();
                console.log(`👥 Clientes online:`, clientes.map((c: any) => c.clientNickname || c.nickname).join(', '));
            }
        } catch (error: any) {
            console.log(`❌ Erro ao enviar poke de next expirado para ${nomeJogador}:`, error.message);
        }
    }

    private async obterNomeJogadorPorDescricao(remetente: any): Promise<{nome: string, valido: boolean, erro?: string}> {
        try {
            console.log('🔍 Iniciando obterNomeJogadorPorDescricao...');
            console.log('📋 Dados do remetente:', {
                invokerid: remetente.invokerid,
                clid: remetente.clid,
                clientNickname: remetente.clientNickname,
                nickname: remetente.nickname
            });

            const clientId = remetente.invokerid || remetente.clid;
            
            if (!clientId) {
                console.log('❌ ClientId não encontrado');
                return {
                    nome: 'Desconhecido',
                    valido: false,
                    erro: '❌ Não foi possível identificar o cliente'
                };
            }

            console.log(`🔍 Buscando informações do cliente ID: ${clientId}`);

            // Verificar se o serverQuery está disponível
            if (!this.serverQuery) {
                console.log('❌ ServerQuery não está conectado');
                return {
                    nome: remetente.clientNickname || remetente.nickname || 'Usuário',
                    valido: false,
                    erro: '❌ Conexão com TeamSpeak indisponível'
                };
            }

            try {
                // Método 1: Tentar clientInfo primeiro
                console.log('📡 Tentativa 1: Chamando clientInfo...');
                const clientInfoArray = await this.serverQuery.clientInfo(clientId);
                console.log('📋 ClientInfo array recebido:', clientInfoArray);
                
                // ClientInfo retorna um array - pegar o primeiro elemento
                const clientInfo = Array.isArray(clientInfoArray) ? clientInfoArray[0] : clientInfoArray;
                console.log('📋 ClientInfo processado:', {
                    clientNickname: clientInfo?.clientNickname,
                    clientDescription: clientInfo?.clientDescription,
                    clid: clientInfo?.clid
                });
                
                // Verificar se existe descrição no clientInfo
                let descricao = clientInfo?.clientDescription?.trim() || '';
                console.log(`📝 Descrição do clientInfo: "${descricao}"`);
                
                if (descricao && descricao !== '') {
                    console.log(`✅ Descrição válida encontrada via clientInfo: "${descricao}"`);
                    return {
                        nome: descricao,
                        valido: true
                    };
                }

                // Método 2: Se clientInfo não tem descrição, usar clientList
                console.log('📡 Tentativa 2: Buscando via clientList...');
                const clientes = await this.serverQuery.clientList();
                console.log(`👥 ${clientes.length} clientes encontrados`);
                
                const clienteEncontrado = clientes.find((c: any) => {
                    const id = c.clid || c.clientId;
                    return id == clientId;
                });

                if (clienteEncontrado) {
                    console.log('📋 Cliente encontrado via clientList:', {
                        clid: clienteEncontrado.clid,
                        clientNickname: clienteEncontrado.clientNickname,
                        clientDescription: clienteEncontrado.clientDescription
                    });
                    
                    descricao = clienteEncontrado.clientDescription?.trim() || '';
                    console.log(`📝 Descrição do clientList: "${descricao}"`);
                    
                    if (descricao && descricao !== '') {
                        console.log(`✅ Descrição válida encontrada via clientList: "${descricao}"`);
                        return {
                            nome: descricao,
                            valido: true
                        };
                    }
                }

                // Se chegou aqui, não tem descrição
                console.log('❌ Descrição vazia ou inexistente em ambos os métodos');
                const nomeTS = remetente.clientNickname || remetente.nickname || 'Usuário';
                return {
                    nome: nomeTS,
                    valido: false,
                    erro: `❌ ${nomeTS}, você precisa configurar sua descrição no TeamSpeak!

Entre em contato com a liderança para isto!

⚠️ Comandos de claimed não funcionarão sem a descrição configurada!`
                };

            } catch (apiError: any) {
                console.log('❌ Erro nas chamadas da API:', apiError.message);
                throw apiError;
            }

        } catch (error: any) {
            console.log(`❌ Erro ao obter descrição do cliente:`, error.message);
            console.log('🔍 Stack trace:', error.stack);
            const nomeTS = remetente.clientNickname || remetente.nickname || 'Usuário';
            return {
                nome: nomeTS,
                valido: false,
                erro: `❌ Erro ao verificar sua descrição: ${error.message}`
            };
        }
    }

    private async buscarClientePorNome(nomeJogador: string): Promise<any> {
        try {
            const clientes = await this.serverQuery.clientList();
            console.log(`🔍 Procurando por: "${nomeJogador}"`);
            console.log(`👥 ${clientes.length} clientes online`);
            
            // Filtrar apenas clientes reais (não ServerQuery)
            const clientesReais = clientes.filter((c: any) => c.type === 0);
            console.log(`👥 ${clientesReais.length} clientes reais online (sem ServerQuery)`);
            
            // Log detalhado dos clientes para debug
            console.log(`📋 Clientes disponíveis para busca:`);
            clientesReais.forEach((c: any, index: number) => {
                console.log(`   ${index + 1}. "${c.clientNickname || c.nickname}" (ID: ${c.clid})`);
            });
            
            let cliente = null;
            
            // 1. Busca exata (case-sensitive)
            cliente = clientesReais.find((c: any) => {
                const nomeCliente = c.clientNickname || c.nickname || '';
                const match = nomeCliente === nomeJogador;
                if (match) {
                    console.log(`✅ Match exato encontrado: "${nomeCliente}" === "${nomeJogador}"`);
                }
                return match;
            });
            
            // 2. Busca case-insensitive
            if (!cliente) {
                console.log(`🔍 Busca exata falhou, tentando case-insensitive...`);
                cliente = clientesReais.find((c: any) => {
                    const nomeCliente = (c.clientNickname || c.nickname || '').toLowerCase();
                    const nomeJogadorLower = nomeJogador.toLowerCase();
                    const match = nomeCliente === nomeJogadorLower;
                    if (match) {
                        console.log(`✅ Match case-insensitive encontrado: "${nomeCliente}" === "${nomeJogadorLower}"`);
                    }
                    return match;
                });
            }
            
            // 3. Busca parcial - cliente contém jogador
            if (!cliente) {
                console.log(`🔍 Busca case-insensitive falhou, tentando busca parcial (cliente contém jogador)...`);
                cliente = clientesReais.find((c: any) => {
                    const nomeCliente = (c.clientNickname || c.nickname || '').toLowerCase();
                    const nomeJogadorLower = nomeJogador.toLowerCase();
                    const match = nomeCliente.includes(nomeJogadorLower);
                    if (match) {
                        console.log(`✅ Match parcial encontrado: "${nomeCliente}" contém "${nomeJogadorLower}"`);
                    }
                    return match;
                });
            }
            
            // 4. Busca parcial - jogador contém cliente
            if (!cliente) {
                console.log(`🔍 Busca parcial (cliente contém jogador) falhou, tentando busca inversa...`);
                cliente = clientesReais.find((c: any) => {
                    const nomeCliente = (c.clientNickname || c.nickname || '').toLowerCase();
                    const nomeJogadorLower = nomeJogador.toLowerCase();
                    const match = nomeJogadorLower.includes(nomeCliente);
                    if (match) {
                        console.log(`✅ Match parcial inverso encontrado: "${nomeJogadorLower}" contém "${nomeCliente}"`);
                    }
                    return match;
                });
            }
            
            // 5. Busca aproximada (remover espaços e caracteres especiais)
            if (!cliente) {
                console.log(`🔍 Busca parcial inversa falhou, tentando busca aproximada...`);
                const nomeJogadorLimpo = nomeJogador.toLowerCase().replace(/[\s\-_\.]/g, '');
                cliente = clientesReais.find((c: any) => {
                    const nomeCliente = (c.clientNickname || c.nickname || '').toLowerCase().replace(/[\s\-_\.]/g, '');
                    const match = nomeCliente === nomeJogadorLimpo || 
                                  nomeCliente.includes(nomeJogadorLimpo) || 
                                  nomeJogadorLimpo.includes(nomeCliente);
                    if (match) {
                        console.log(`✅ Match aproximado encontrado: "${nomeCliente}" ≈ "${nomeJogadorLimpo}"`);
                    }
                    return match;
                });
            }
            
            if (cliente) {
                console.log(`✅ Cliente encontrado: "${cliente.clientNickname || cliente.nickname}" (ID: ${cliente.clid}, Type: ${cliente.type})`);
                
                // Se não tiver clientUniqueIdentifier no clientList, buscar via clientInfo
                if (!cliente.clientUniqueIdentifier && cliente.clid) {
                    try {
                        console.log(`🔍 Buscando Unique ID via clientInfo para ${cliente.clid}...`);
                        const clientInfoArray = await this.serverQuery.clientInfo(cliente.clid);
                        const clientInfo = Array.isArray(clientInfoArray) ? clientInfoArray[0] : clientInfoArray;
                        if (clientInfo && clientInfo.clientUniqueIdentifier) {
                            cliente.clientUniqueIdentifier = clientInfo.clientUniqueIdentifier;
                            console.log(`✅ Unique ID obtido: ${cliente.clientUniqueIdentifier}`);
                        } else {
                            console.log(`⚠️ Unique ID não encontrado no clientInfo`);
                        }
                    } catch (error: any) {
                        console.log(`⚠️ Erro ao obter clientInfo: ${error.message}`);
                    }
                }
            } else {
                console.log(`❌ Cliente "${nomeJogador}" não encontrado após todas as tentativas`);
                console.log(`📋 Tentativas realizadas:`);
                console.log(`   1. Busca exata: "${nomeJogador}"`);
                console.log(`   2. Case-insensitive: "${nomeJogador.toLowerCase()}"`);
                console.log(`   3. Parcial (cliente contém): Contains "${nomeJogador.toLowerCase()}"`);
                console.log(`   4. Parcial (jogador contém): "${nomeJogador.toLowerCase()}" contains cliente`);
                console.log(`   5. Aproximada: "${nomeJogador.toLowerCase().replace(/[\s\-_\.]/g, '')}"`);
            }
            
            return cliente;
        } catch (error: any) {
            console.log(`❌ Erro ao buscar cliente ${nomeJogador}:`, error.message);
            return null;
        }
    }

    private async buscarClientePorDescricao(nomePersonagem: string): Promise<any> {
        try {
            const clientes = await this.serverQuery.clientList();
            console.log(`🔍 Procurando cliente por descrição: "${nomePersonagem}"`);
            console.log(`👥 ${clientes.length} clientes online`);
            
            // Filtrar apenas clientes reais (não ServerQuery)
            const clientesReais = clientes.filter((c: any) => c.type === 0);
            console.log(`👥 ${clientesReais.length} clientes reais online (sem ServerQuery)`);
            
            // Para buscar por descrição, precisamos verificar clientInfo de cada cliente
            for (const cliente of clientesReais) {
                try {
                    console.log(`🔍 Verificando descrição do cliente "${cliente.clientNickname || cliente.nickname}" (ID: ${cliente.clid})...`);
                    
                    const clientInfoArray = await this.serverQuery.clientInfo(cliente.clid);
                    const clientInfo = Array.isArray(clientInfoArray) ? clientInfoArray[0] : clientInfoArray;
                    
                    if (clientInfo && clientInfo.clientDescription) {
                        const descricao = clientInfo.clientDescription.trim();
                        console.log(`📝 Descrição encontrada: "${descricao}"`);
                        
                        // Verificar match exato
                        if (descricao === nomePersonagem) {
                            console.log(`✅ Match exato por descrição: "${descricao}" === "${nomePersonagem}"`);
                            // Copiar Unique ID para o objeto cliente
                            cliente.clientUniqueIdentifier = clientInfo.clientUniqueIdentifier;
                            cliente.clientDescription = descricao;
                            return cliente;
                        }
                        
                        // Verificar match case-insensitive
                        if (descricao.toLowerCase() === nomePersonagem.toLowerCase()) {
                            console.log(`✅ Match case-insensitive por descrição: "${descricao}" ≈ "${nomePersonagem}"`);
                            cliente.clientUniqueIdentifier = clientInfo.clientUniqueIdentifier;
                            cliente.clientDescription = descricao;
                            return cliente;
                        }
                        
                        // Verificar match parcial
                        if (descricao.toLowerCase().includes(nomePersonagem.toLowerCase()) || 
                            nomePersonagem.toLowerCase().includes(descricao.toLowerCase())) {
                            console.log(`✅ Match parcial por descrição: "${descricao}" ≈ "${nomePersonagem}"`);
                            cliente.clientUniqueIdentifier = clientInfo.clientUniqueIdentifier;
                            cliente.clientDescription = descricao;
                            return cliente;
                        }
                    } else {
                        console.log(`📝 Sem descrição para cliente "${cliente.clientNickname || cliente.nickname}"`);
                    }
                } catch (error: any) {
                    console.log(`⚠️ Erro ao verificar clientInfo para ${cliente.clid}: ${error.message}`);
                    continue;
                }
            }
            
            console.log(`❌ Nenhum cliente encontrado com descrição "${nomePersonagem}"`);
            return null;
        } catch (error: any) {
            console.log(`❌ Erro ao buscar cliente por descrição ${nomePersonagem}:`, error.message);
            return null;
        }
    }

    private async obterClientIdPorNome(nomeJogador: string): Promise<string> {
        try {
            const cliente = await this.buscarClientePorNome(nomeJogador);
            if (!cliente) {
                console.log(`⚠️ Cliente ${nomeJogador} não encontrado - retornando ID vazio`);
                return '';
            }
            
            // Prioridade 1: clientUniqueIdentifier (melhor para links)
            if (cliente.clientUniqueIdentifier) {
                console.log(`🔍 Unique ID encontrado para ${nomeJogador}: ${cliente.clientUniqueIdentifier}`);
                return cliente.clientUniqueIdentifier;
            }
            
            // Se não tem Unique ID no clientList, forçar busca via clientInfo
            if (cliente.clid && !cliente.clientUniqueIdentifier) {
                console.log(`🔍 Forçando busca de Unique ID via clientInfo para ${nomeJogador} (ID: ${cliente.clid})...`);
                try {
                    const clientInfoArray = await this.serverQuery.clientInfo(cliente.clid);
                    const clientInfo = Array.isArray(clientInfoArray) ? clientInfoArray[0] : clientInfoArray;
                    if (clientInfo && clientInfo.clientUniqueIdentifier) {
                        console.log(`✅ Unique ID obtido via clientInfo para ${nomeJogador}: ${clientInfo.clientUniqueIdentifier}`);
                        return clientInfo.clientUniqueIdentifier;
                    } else {
                        console.log(`⚠️ ClientInfo não retornou Unique ID para ${nomeJogador}`);
                    }
                } catch (infoError: any) {
                    console.log(`❌ Erro ao buscar clientInfo para ${nomeJogador}: ${infoError.message}`);
                }
            }
            
            // Prioridade 2: ID numérico (funciona como fallback)
            if (cliente.clid) {
                console.log(`🔍 ID numérico usado para ${nomeJogador}: ${cliente.clid} (Unique ID não disponível)`);
                return cliente.clid.toString();
            }
            
            // Prioridade 3: Tentar outras propriedades de ID
            if (cliente.clientId) {
                console.log(`🔍 ClientId alternativo usado para ${nomeJogador}: ${cliente.clientId}`);
                return cliente.clientId.toString();
            }
            
            // Último recurso: log completo das propriedades do cliente
            console.log(`⚠️ Nenhum ID válido encontrado para ${nomeJogador}`);
            console.log(`📋 Propriedades do cliente:`, Object.keys(cliente));
            console.log(`📋 Valores das propriedades:`, JSON.stringify(cliente, null, 2));
            
            return '';
        } catch (error: any) {
            console.log(`❌ Erro ao obter ID do cliente ${nomeJogador}:`, error.message);
            return '';
        }
    }

    private async obterClientIdPorPersonagem(nomePersonagem: string): Promise<string> {
        try {
            console.log(`🔍 Buscando cliente por personagem: "${nomePersonagem}"`);
            
            // Buscar cliente pela descrição (nome do personagem)
            const cliente = await this.buscarClientePorDescricao(nomePersonagem);
            if (!cliente) {
                console.log(`⚠️ Nenhum cliente encontrado com personagem "${nomePersonagem}"`);
                return '';
            }
            
            console.log(`✅ Cliente encontrado: "${cliente.clientNickname || cliente.nickname}" com personagem "${nomePersonagem}"`);
            
            // Prioridade 1: clientUniqueIdentifier (melhor para links)
            if (cliente.clientUniqueIdentifier) {
                console.log(`🔍 Unique ID encontrado para personagem ${nomePersonagem}: ${cliente.clientUniqueIdentifier}`);
                return cliente.clientUniqueIdentifier;
            }
            
            // Se não tem Unique ID, forçar busca via clientInfo
            if (cliente.clid) {
                console.log(`🔍 Forçando busca de Unique ID via clientInfo para personagem ${nomePersonagem} (Cliente: ${cliente.clientNickname}, ID: ${cliente.clid})...`);
                try {
                    const clientInfoArray = await this.serverQuery.clientInfo(cliente.clid);
                    const clientInfo = Array.isArray(clientInfoArray) ? clientInfoArray[0] : clientInfoArray;
                    if (clientInfo && clientInfo.clientUniqueIdentifier) {
                        console.log(`✅ Unique ID obtido via clientInfo para personagem ${nomePersonagem}: ${clientInfo.clientUniqueIdentifier}`);
                        return clientInfo.clientUniqueIdentifier;
                    } else {
                        console.log(`⚠️ ClientInfo não retornou Unique ID para personagem ${nomePersonagem}`);
                    }
                } catch (infoError: any) {
                    console.log(`❌ Erro ao buscar clientInfo para personagem ${nomePersonagem}: ${infoError.message}`);
                }
            }
            
            // Fallback para ID numérico
            if (cliente.clid) {
                console.log(`🔍 ID numérico usado para personagem ${nomePersonagem}: ${cliente.clid} (Unique ID não disponível)`);
                return cliente.clid.toString();
            }
            
            console.log(`⚠️ Nenhum ID válido encontrado para personagem ${nomePersonagem}`);
            return '';
        } catch (error: any) {
            console.log(`❌ Erro ao obter ID do cliente por personagem ${nomePersonagem}:`, error.message);
            return '';
        }
    }

    private criarLinkJogador(nomeJogador: string, clientId: string): string {
        if (!clientId || clientId === '') {
            console.log(`🔗 Sem ID para ${nomeJogador}, retornando apenas nome`);
            return nomeJogador; // Retorna apenas o nome se não tiver ID
        }
        
        console.log(`🔗 Criando link para ${nomeJogador} com ID: ${clientId}`);
        
        // Determinar se é Unique ID (string longa) ou ID numérico (apenas números)
        const isNumericId = /^\d+$/.test(clientId);
        let linkFinal: string;
        
        if (isNumericId) {
            // Para ID numérico, usar formato client simples
            linkFinal = `[client=${clientId}]${nomeJogador}[/client]`;
            console.log(`🔗 Link com ID numérico criado: ${linkFinal}`);
        } else {
            // Para Unique ID, usar formato URL (melhor compatibilidade)
            linkFinal = `[url=client://0/${clientId}]${nomeJogador}[/url]`;
            console.log(`🔗 Link com Unique ID criado: ${linkFinal}`);
            console.log(`✅ Usando clientUniqueIdentifier para ${nomeJogador} - link clicável otimizado`);
        }
        
        return linkFinal;
    }

    private obterTempopadrao(codigo: string): number {
        const nomeRespawn = this.obterNomeRespawn(codigo).toLowerCase();
        
        // Respawns Tier 3 (03:15 = 3 horas e 15 minutos = 11700 segundos)
        if (nomeRespawn.includes('tier 3')) {
            return 11700; // 03:15
        }
        
        // Respawns Tier 1 e Tier 2 (02:30 = 2 horas e 30 minutos = 9000 segundos)
        if (nomeRespawn.includes('tier 1') || nomeRespawn.includes('tier 2')) {
            return 9000; // 02:30
        }
        
        // Padrão para outros respawns (02:30)
        return 9000; // 02:30
    }

    private obterNomeRespawn(codigo: string): string {
        // Usar o respawnsList carregado do arquivo respawns-list.json
        const nomeDoArquivo = this.respawnsList[codigo.toLowerCase()];
        
        if (nomeDoArquivo) {
            return nomeDoArquivo;
        }
        
        // Fallback para códigos não encontrados
        return `Respawn ${codigo.toUpperCase()}`;
    }

    private obterConfigRespawns(): { [key: string]: string } {
        // Gerar configuração dinamicamente baseada no respawnsList
        return { ...this.respawnsList };
    }

    private formatarTempo(segundos: number): string {
        if (segundos < 0) return '00:00';
        
        const horas = Math.floor(segundos / 3600);
        const minutos = Math.floor((segundos % 3600) / 60);
        
        // Sempre retorna no formato HH:MM (sem segundos)
        return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    }

    private formatarDataMorte(timeString: string): string {
        try {
            // Formato esperado da API: "Dec 25 2023, 14:30:45 CET"
            // Remover timezone para fazer o parse
            const cleanTime = timeString.replace(' CET', '').replace(' CEST', '');
            const date = new Date(cleanTime);
            
            // Verificar se a data é válida
            if (isNaN(date.getTime())) {
                console.log(`⚠️ Data inválida recebida: ${timeString}`);
                return timeString; // Retorna original se não conseguir formatar
            }
            
            // Formatar para DD/MM/AAAA HH:MM
            const dia = date.getDate().toString().padStart(2, '0');
            const mes = (date.getMonth() + 1).toString().padStart(2, '0');
            const ano = date.getFullYear();
            const hora = date.getHours().toString().padStart(2, '0');
            const minuto = date.getMinutes().toString().padStart(2, '0');
            
            return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
            
        } catch (error: any) {
            console.log(`❌ Erro ao formatar data da morte: ${timeString}`, error.message);
            return timeString; // Retorna original em caso de erro
        }
    }

    private readonly RESPAWNS_FILE = path.join(__dirname, '..', 'respawns-list.json');

    private carregarRespawnsPersistidos(): void {
        try {
            if (fs.existsSync(this.RESPAWNS_FILE)) {
                console.log('📂 Carregando respawns persistidos...');
                const data = fs.readFileSync(this.RESPAWNS_FILE, 'utf8');
                this.respawnsList = JSON.parse(data);
                
                const totalRespawns = Object.keys(this.respawnsList).length;
                
                console.log(`✅ Carregados ${totalRespawns} respawns`);
            } else {
                console.log('📂 Arquivo de respawns não encontrado, inicializando com padrões...');
                this.inicializarRespawnsPadrao();
                this.salvarRespawnsPersistidos();
            }
        } catch (error: any) {
            console.log(`❌ Erro ao carregar respawns: ${error.message}`);
            console.log('🔄 Inicializando com respawns padrão...');
            this.inicializarRespawnsPadrao();
            this.salvarRespawnsPersistidos();
        }
    }

    private salvarRespawnsPersistidos(): void {
        try {
            const data = JSON.stringify(this.respawnsList, null, 2);
            fs.writeFileSync(this.RESPAWNS_FILE, data, 'utf8');
            
            const totalRespawns = Object.keys(this.respawnsList).length;
            
            console.log(`💾 Respawns salvos: ${totalRespawns} respawns`);
        } catch (error: any) {
            console.log(`❌ Erro ao salvar respawns: ${error.message}`);
        }
    }

    // ===== SISTEMA DE HUNTEDS =====

    private readonly HUNTEDS_FILE = path.join(__dirname, '..', 'hunteds-list.json');

    private carregarHuntedsList(): void {
        try {
            if (fs.existsSync(this.HUNTEDS_FILE)) {
                console.log('🎯 Carregando lista de hunteds...');
                const data = fs.readFileSync(this.HUNTEDS_FILE, 'utf8');
                this.huntedsList = JSON.parse(data);
                
                console.log(`✅ Carregados ${this.huntedsList.length} hunteds`);
            } else {
                console.log('🎯 Arquivo de hunteds não encontrado, criando vazio...');
                this.huntedsList = [];
                this.salvarHuntedsList();
            }
        } catch (error: any) {
            console.log(`❌ Erro ao carregar hunteds: ${error.message}`);
            console.log('🔄 Inicializando lista vazia...');
            this.huntedsList = [];
            this.salvarHuntedsList();
        }
    }

    private salvarHuntedsList(): void {
        try {
            const data = JSON.stringify(this.huntedsList, null, 2);
            fs.writeFileSync(this.HUNTEDS_FILE, data, 'utf8');
            
            console.log(`💾 Hunteds salvos: ${this.huntedsList.length} hunteds`);
        } catch (error: any) {
            console.log(`❌ Erro ao salvar hunteds: ${error.message}`);
        }
    }

    private async buscarHuntedsOnline(): Promise<any[]> {
        try {
            const worldName = 'Kalibra';
            console.log(`🔍 Buscando players online no mundo "${worldName}"...`);
            
            const response = await axios.get(`https://api.tibiadata.com/v4/world/${encodeURIComponent(worldName)}`, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'AliBotTS3-Hunteds-Monitor/1.0'
                }
            });

            if (response.data && response.data.world) {
                const world = response.data.world;
                console.log(`🌍 Mundo encontrado: ${world.name || 'Nome não disponível'}`);
                console.log(`📊 Players online total: ${world.players_online || 'N/A'}`);
                
                // A API v4 usa "online_players" como array de players online
                if (world.online_players && Array.isArray(world.online_players)) {
                    const playersOnline = world.online_players;
                    console.log(`👥 ${playersOnline.length} players online no mundo ${worldName}`);
                    
                    // Log dos primeiros players para verificar estrutura (apenas quando há poucos hunteds)
                    if (this.huntedsList.length <= 3 && playersOnline.length > 0) {
                        console.log('📋 Estrutura do primeiro player (debug):');
                        console.log(`   Nome: ${playersOnline[0].name}, Level: ${playersOnline[0].level}, Vocação: ${playersOnline[0].vocation}`);
                    }
                    
                    // Filtrar apenas os hunteds que estão online
                    const huntedsOnline = playersOnline.filter((player: any) => {
                        if (!player || !player.name) {
                            console.log('⚠️ Player sem nome encontrado:', player);
                            return false;
                        }
                        
                        const playerName = player.name.toLowerCase();
                        const isHunted = this.huntedsList.some(hunted => hunted.toLowerCase() === playerName);
                        
                        if (isHunted) {
                            console.log(`🎯 Hunted encontrado online: ${player.name} (Level ${player.level || '?'})`);
                        }
                        
                        return isHunted;
                    });
                    
                    console.log(`🎯 ${huntedsOnline.length} hunteds encontrados online`);
                    
                    // Verificar se há novos hunteds online desde a última verificação
                    await this.verificarNovosHuntedsOnline(huntedsOnline);
                    
                    return huntedsOnline;
                } else {
                    console.log('❌ Propriedade online_players não encontrada ou não é um array');
                    console.log('📋 Propriedades disponíveis no world:', Object.keys(world));
                    return [];
                }
            } else {
                console.log('⚠️ Estrutura de resposta da API inesperada');
                console.log('📋 Dados recebidos (primeiros 500 chars):', JSON.stringify(response.data, null, 2).substring(0, 500));
                return [];
            }
            
        } catch (error: any) {
            if (error.code === 'ECONNABORTED') {
                console.log('⏱️ Timeout na conexão com a API do Tibia (15s)');
            } else if (error.response) {
                console.log(`❌ Erro HTTP ${error.response.status}: ${error.response.statusText}`);
                if (error.response.data) {
                    console.log('📋 Resposta do erro:', JSON.stringify(error.response.data, null, 2));
                }
            } else if (error.request) {
                console.log('🌐 Erro de rede - não foi possível conectar à API do Tibia');
            } else {
                console.log('❌ Erro inesperado ao buscar hunteds online:', error.message);
                console.log('📋 Stack trace:', error.stack);
            }
            
            return [];
        }
    }

    private async verificarNovosHuntedsOnline(huntedsOnlineAtual: any[]): Promise<void> {
        try {
            // Obter nomes dos hunteds que estão online agora
            const nomesHuntedsAtual = huntedsOnlineAtual.map(hunted => hunted.name.toLowerCase());
            
            // Verificar se há novos hunteds online (que não estavam na verificação anterior)
            const novosHuntedsOnline = huntedsOnlineAtual.filter(hunted => {
                const nomeHunted = hunted.name.toLowerCase();
                return !this.huntedsOnlineAnterior.includes(nomeHunted);
            });
            
            if (novosHuntedsOnline.length > 0) {
                console.log(`🚨 ${novosHuntedsOnline.length} novo(s) hunted(s) detectado(s) online!`);
                
                // Só enviar notificações se estiverem ativas
                if (this.notificacoesHuntedsAtivas) {
                    await this.enviarNotificacaoHuntedOnline(novosHuntedsOnline);
                } else {
                    console.log('🔕 Notificações de hunteds desativadas - não enviando alertas');
                }
            }
            
            // Atualizar lista de hunteds online para próxima verificação
            this.huntedsOnlineAnterior = nomesHuntedsAtual;
            
        } catch (error: any) {
            console.log('❌ Erro ao verificar novos hunteds online:', error.message);
        }
    }

    private async enviarNotificacaoHuntedOnline(novosHunteds: any[]): Promise<void> {
        try {
            if (!this.serverQuery) {
                console.log('⚠️ ServerQuery não conectado, não é possível enviar notificações');
                return;
            }

            // Obter lista de todos os clientes conectados
            const clients = await this.serverQuery.clientList();
            const realClients = clients.filter((c: any) => c.type === 0); // Apenas clientes reais (não bots)
            
            console.log(`📢 Enviando notificação de hunted online para ${realClients.length} usuários conectados`);
            
            // Construir mensagem de alerta
            let mensagem = `🚨 [color=red][b]ALERTA DE HUNTED ONLINE![/b][/color] 🚨

`;
            
            if (novosHunteds.length === 1) {
                const hunted = novosHunteds[0];
                mensagem += `🎯 [b]${hunted.name}[/b] acabou de ficar online!
📊 Level: ${hunted.level || '?'}
⚔️ Vocação: ${hunted.vocation || 'Unknown'}
⚠️ [color=orange]Amassa ele bro! 🚜[/color]`;
            } else {
                mensagem += `🎯 [b]${novosHunteds.length} hunteds[/b] acabaram de ficar online:

`;
                novosHunteds.forEach(hunted => {
                    mensagem += `• [b]${hunted.name}[/b] (Lv.${hunted.level || '?'}) - ${hunted.vocation || 'Unknown'}
`;
                });
                
                mensagem += `
⚠️ [color=orange]Amassa ele bro! 🚜[/color]`;
            }
            
            mensagem += `

🔍 Use !hunteds para ver lista completa
🤖 Sistema: AliBot - Monitor de Hunteds`;

            // Enviar mensagem privada para cada cliente conectado
            const promises = realClients.map(async (client: any) => {
                try {
                    await this.serverQuery.sendTextMessage(client.clid, 1, mensagem);
                    console.log(`✅ Notificação enviada para: ${client.nickname} (ID: ${client.clid})`);
                } catch (error: any) {
                    console.log(`❌ Erro ao enviar notificação para ${client.nickname}:`, error.message);
                }
            });
            
            // Aguardar todos os envios
            await Promise.allSettled(promises);
            
            const nomeHunteds = novosHunteds.map(h => h.name).join(', ');
            console.log(`📢 Notificações enviadas sobre hunted(s): ${nomeHunteds}`);
            
        } catch (error: any) {
            console.log('❌ Erro ao enviar notificações de hunted online:', error.message);
        }
    }

    private async atualizarCanalHunteds(): Promise<void> {
        if (!this.serverQuery) {
            throw new Error('ServerQuery não está conectado');
        }

        try {
            const huntedsChannelId = "10"; // ID do canal Hunteds - ajustar conforme necessário
            
            console.log('🎯 Iniciando atualização do canal Hunteds...');
            
            // Buscar hunteds online com tratamento de erro
            let huntedsOnline: any[] = [];
            try {
                huntedsOnline = await this.buscarHuntedsOnline();
                console.log(`✅ Busca de hunteds concluída: ${huntedsOnline.length} encontrados`);
            } catch (searchError: any) {
                console.log(`❌ Erro na busca de hunteds online: ${searchError.message}`);
                // Continuar com lista vazia em caso de erro na API
                huntedsOnline = [];
            }
            
            // Construir descrição do canal
            let descricao = `[img]https://i.imgur.com/7Bryvk2.png[/img]

🎯 SISTEMA DE HUNTEDS - ALIBOT 🎯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️ Lista de Inimigos Monitorados ⚔️
🌍 Mundo: Kalibra

`;

            if (huntedsOnline.length === 0) {
                const statusMsg = this.huntedsList.length > 0 ? 
                    'Nenhum hunted online no momento' : 
                    'Lista de hunteds vazia - use !addhunted para adicionar';
                    
                descricao += `� ${statusMsg}
�🕐 Última verificação: ${new Date().toLocaleString('pt-BR')}
📡 API: TibiaData v4

💡 Esta lista é atualizada automaticamente a cada 1 minuto.
🔄 Sistema monitora hunteds no mundo Kalibra.
📋 Use !addhunted [nome] para adicionar
🗑️ Use !delhunted [nome] para remover
🌐 Fonte: https://api.tibiadata.com/`;
            } else {
                descricao += `🔥 ${huntedsOnline.length} hunted(s) online:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
                
                // Ordenar por level (maior primeiro) com validação
                try {
                    huntedsOnline.sort((a, b) => {
                        const levelA = a.level || 0;
                        const levelB = b.level || 0;
                        return levelB - levelA;
                    });
                } catch (sortError) {
                    console.log('⚠️ Erro ao ordenar hunteds por level, mantendo ordem original');
                }
                
                huntedsOnline.forEach((hunted: any) => {
                    const level = hunted.level || '?';
                    const nome = hunted.name || 'Nome não disponível';
                    const vocation = hunted.vocation || 'Unknown';
                    
                    const iconeVocacao = this.obterIconeVocacao(vocation);
                    
                    descricao += `${iconeVocacao} Lv.${level} [b][color=red]${nome}[/color][/b] (${vocation})
`;
                });
                
                // Estatísticas adicionais com validação
                try {
                    const levelsValidos = huntedsOnline.filter(h => h.level && !isNaN(h.level)).map(h => h.level);
                    const levelMedio = levelsValidos.length > 0 ? 
                        Math.round(levelsValidos.reduce((sum, level) => sum + level, 0) / levelsValidos.length) : 0;
                    const levelMaisAlto = levelsValidos.length > 0 ? Math.max(...levelsValidos) : 0;
                    
                    descricao += `\n📊 [b]ESTATÍSTICAS:[/b]
📈 Level médio: ${levelMedio}
👑 Level mais alto: ${levelMaisAlto}
⏰ Última atualização: ${new Date().toLocaleTimeString('pt-BR')}
🎯 Mundo: [b]Kalibra[/b]
🤖 Sistema: AliBot 🧙‍♂️
📡 API: TibiaData v4

💡 [b]COMANDOS:[/b]
📋 !addhunted [nome] - Adicionar à lista
🗑️ !delhunted [nome] - Remover da lista
📊 !hunteds - Atualizar lista manualmente`;
                } catch (statsError) {
                    console.log('⚠️ Erro ao calcular estatísticas, adicionando informações básicas');
                    descricao += `\n⏰ Última atualização: ${new Date().toLocaleTimeString('pt-BR')}
🎯 Mundo: [b]Kalibra[/b]
🤖 Sistema: AliBot 🧙‍♂️`;
                }
            }
            
            // Verificar se precisa atualizar
            let precisaAtualizar = true;
            try {
                const channelInfo = await this.serverQuery.channelInfo(huntedsChannelId);
                const descricaoAtual = (channelInfo as any).channel_description || "";
                
                if (descricaoAtual.trim() === descricao.trim()) {
                    precisaAtualizar = false;
                    console.log(`🎯 Canal Hunteds já está atualizado (${huntedsOnline.length} online) - sem modificações`);
                }
            } catch (error) {
                console.log('⚠️ Erro ao verificar estado atual do canal, forçando atualização');
                precisaAtualizar = true;
            }
            
            // Atualizar canal apenas se necessário
            if (precisaAtualizar) {
                try {
                    await this.serverQuery.channelEdit(huntedsChannelId, {
                        channel_description: descricao
                    });
                    
                    console.log(`🎯 Canal Hunteds atualizado: ${huntedsOnline.length} hunteds online de ${this.huntedsList.length} monitorados`);
                } catch (updateError: any) {
                    console.log(`❌ Erro ao atualizar canal Hunteds: ${updateError.message}`);
                    throw updateError;
                }
            }
            
        } catch (error: any) {
            console.log('❌ Erro geral ao atualizar canal Hunteds:', error.message);
            throw error;
        }
    }

    private inicializarRespawnsPadrao(): void {
        // Inicializar com os respawns padrão já existentes
        this.respawnsList = {
            'f4': 'Ferumbras Ascendant (F4)',
            'f3': 'Ferumbras Mortal Shell (F3)',
            'f2': 'Ferumbras Citadel (F2)',
            'f1': 'Ferumbras Threated Dreams (F1)',
            'wz': 'Warzone',
            'gt': 'Grave Threat',
            'iod': 'Isle of Destiny',
            'ff': 'Falcon Bastion',
            'cobra': 'Cobra Bastion',
            'lions': 'Lion\'s Rock',
            'asura': 'Asura Palace',
            'winter': 'Winter Court',
            'summer': 'Summer Court',
            'dara': 'Dara Cave',
            'werehyaena': 'Werehyaena Cave',
            'werewolf': 'Werewolf Cave',
            'werebadger': 'Werebadger Cave',
            'werebear': 'Werebear Cave',
            'wereboar': 'Wereboar Cave'
        };
    }

    private async processarComandoAddResp(comando: string, remetente: any): Promise<string> {
        try {
            const partes = comando.trim().split(' ');
            
            if (partes.length < 3) {
                return `❌ Formato incorreto!
📋 Use: !addresp [código] [nome do respawn]
💡 Exemplo: !addresp v1 Dragon Lair Venore`;
            }

            const codigo = partes[1].toLowerCase();
            const nomeRespawn = partes.slice(2).join(' ');
            
            // Verificar se o código já existe
            if (this.respawnsList[codigo]) {
                return `❌ Código "${codigo}" já existe!
⚠️ Respawn existente: ${this.respawnsList[codigo]}
💡 Use um código diferente`;
            }

            // Adicionar respawn
            this.respawnsList[codigo] = nomeRespawn;

            // Salvar alterações
            this.salvarRespawnsPersistidos();

            return `✅ Respawn adicionado com sucesso!
⚔️ Código: ${codigo}
📝 Nome: ${nomeRespawn}
� Dados salvos automaticamente`;

        } catch (error: any) {
            return `❌ Erro ao adicionar respawn: ${error.message}`;
        }
    }

    private async processarComandoListPlaces(comando: string, remetente: any): Promise<string> {
        try {
            if (Object.keys(this.respawnsList).length === 0) {
                return `📋 Nenhum respawn cadastrado ainda
💡 Use !addresp [código] [nome] para adicionar respawns`;
            }

            let resposta = `📋 RESPAWNS CADASTRADOS (${Object.keys(this.respawnsList).length}):\n\n`;

            // Ordenar respawns por código
            const respawnsOrdenados = Object.entries(this.respawnsList).sort((a, b) => a[0].localeCompare(b[0]));

            for (const [codigo, nome] of respawnsOrdenados) {
                resposta += `⚔️ ${codigo} → ${nome}\n`;
            }

            resposta += `\n💡 Comandos disponíveis:
!addresp [código] [nome] - Adicionar respawn
!delresp [código] - Remover respawn
!deleteresp [código] - Remover respawn (alias)
!backuprespawns - Fazer backup manual
!listplaces - Listar todos os respawns`;

            return resposta.trim();

        } catch (error: any) {
            return `❌ Erro ao listar respawns: ${error.message}`;
        }
    }

    private async processarComandoDelResp(comando: string, remetente: any): Promise<string> {
        try {
            const partes = comando.trim().split(' ');
            
            if (partes.length < 2) {
                return `❌ Formato incorreto!
📋 Use: !delresp [código] ou !deleteresp [código]
💡 Exemplo: !delresp v1 ou !deleteresp v1`;
            }

            const codigo = partes[1].toLowerCase();
            
            // Verificar se o respawn existe
            if (!this.respawnsList[codigo]) {
                return `❌ Código "${codigo}" não encontrado!
📋 Use !listplaces para ver todos os respawns
💡 Verifique se o código está correto`;
            }

            const nomeRespawn = this.respawnsList[codigo];
            
            // Remover respawn
            delete this.respawnsList[codigo];

            // Salvar alterações
            this.salvarRespawnsPersistidos();

            return `✅ Respawn removido com sucesso!
⚔️ Código: ${codigo}
📝 Nome: ${nomeRespawn}
� Dados salvos automaticamente`;

        } catch (error: any) {
            return `❌ Erro ao remover respawn: ${error.message}`;
        }
    }

    private async processarComandoBackupRespawns(comando: string, remetente: any): Promise<string> {
        try {
            // Fazer backup imediato
            this.salvarRespawnsPersistidos();
            
            // Criar backup com timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(__dirname, '..', `respawns-backup-${timestamp}.json`);
            
            const data = JSON.stringify(this.respawnsList, null, 2);
            fs.writeFileSync(backupFile, data, 'utf8');
            
            const totalRespawns = Object.keys(this.respawnsList).length;
            
            return `✅ Backup realizado com sucesso!
📁 Arquivo principal: respawns-list.json
📁 Backup timestamped: respawns-backup-${timestamp}.json
📊 ${totalRespawns} respawns salvos
🕐 ${new Date().toLocaleString('pt-BR')}`;

        } catch (error: any) {
            return `❌ Erro ao fazer backup: ${error.message}`;
        }
    }

    private obterIconeVocacao(vocation: string): string {
        const vocacaoLower = vocation.toLowerCase();
        
        if (vocacaoLower.includes('druid')) {
            return '🌿'; // Druid
        } else if (vocacaoLower.includes('sorcerer')) {
            return '🔥'; // Sorcerer
        } else if (vocacaoLower.includes('knight')) {
            return '⚔️'; // Knight
        } else if (vocacaoLower.includes('paladin')) {
            return '🏹'; // Paladin
        } else if (vocacaoLower.includes('monk')) {
            return '🥊'; // Monk
        } else {
            return '❓'; // Desconhecido
        }
    }

    private async processarComandoBot(comando: string, remetente: any): Promise<string> {
        try {
            // Obter nome do jogador através da descrição
            const infoJogador = await this.obterNomeJogadorPorDescricao(remetente);
            if (!infoJogador.valido) {
                return infoJogador.erro || '❌ Erro ao obter informações do jogador';
            }
            const nomeJogador = infoJogador.nome;
            
            // Abrir chat privado com mensagem de boas-vindas
            try {
                const mensagemBoasVindas = `[color=blue]🤖 ALIBOT - BOAS-VINDAS! 🤖[/color]

Olá ${nomeJogador}! 👋

Seja bem-vindo ao AliBot!

❗ IMPORTANTE:
• Use !help para ver todos os comandos disponíveis
• Use os canal "Claimeds" para observar/gerenciar seus claimeds
• Configure sua descrição no TeamSpeak com o nome do personagem para usar comandos de claimeds!
Bom Game! 🎯✨`;

                // Abrir chat privado (targetmode 1 = chat privado)
                await this.serverQuery.sendTextMessage(remetente.clid, 1, mensagemBoasVindas);
                console.log(`🤖 Chat privado aberto com ${nomeJogador} (ID: ${remetente.clid})`);
                
                return `✅ Chat privado aberto! Verifique sua aba de mensagens privadas 💬`;
                
            } catch (error: any) {
                console.log(`❌ Erro ao abrir chat privado com ${nomeJogador}:`, error.message);
                return `❌ Erro ao abrir chat privado. Tente novamente.`;
            }
            
        } catch (error: any) {
            console.log('❌ Erro no comando !bot:', error.message);
            return `❌ Erro ao processar comando !bot: ${error.message}`;
        }
    }

    private async processarComandoAddHunted(comando: string, remetente: any): Promise<string> {
        try {
            const partes = comando.trim().split(' ');
            
            if (partes.length < 2) {
                return `❌ Formato incorreto!
📋 Use: !addhunted [nome do personagem]
💡 Exemplos:
   !addhunted Mornarm
   !addhunted Sin Blade (suporta nomes compostos)`;
            }

            // Pegar nome do personagem (pode ter espaços)
            const nomeHunted = partes.slice(1).join(' ');
            
            // Verificar se o nome é válido
            if (nomeHunted.length < 2) {
                return `❌ Nome muito curto!
💡 O nome deve ter pelo menos 2 caracteres`;
            }

            // Verificar se já existe na lista (case insensitive)
            const nomeExistente = this.huntedsList.find(
                hunted => hunted.toLowerCase() === nomeHunted.toLowerCase()
            );
            
            if (nomeExistente) {
                return `❌ "${nomeExistente}" já está na lista de hunteds!
📋 Use !hunteds para ver a lista atualizada`;
            }

            // Adicionar à lista (mantém capitalização original)
            this.huntedsList.push(nomeHunted);
            
            // Salvar no arquivo
            this.salvarHuntedsList();
            
            // Atualizar canal Hunteds
            await this.atualizarCanalHunteds();

            return `✅ Hunted adicionado com sucesso!
🎯 Nome: ${nomeHunted}
📊 Total de hunteds: ${this.huntedsList.length}
🔄 Canal Hunteds atualizado`;

        } catch (error: any) {
            console.log('❌ Erro no comando !addhunted:', error.message);
            return `❌ Erro ao adicionar hunted: ${error.message}`;
        }
    }

    private async processarComandoDelHunted(comando: string, remetente: any): Promise<string> {
        try {
            const partes = comando.trim().split(' ');
            
            if (partes.length < 2) {
                return `❌ Formato incorreto!
📋 Use: !delhunted [nome do personagem]
💡 Exemplos:
   !delhunted Mornarm
   !delhunted Sin Blade (suporta nomes compostos)`;
            }

            // Pegar nome do personagem (pode ter espaços)
            const nomeHunted = partes.slice(1).join(' ');
            
            // Encontrar o hunted na lista (case insensitive)
            const indiceHunted = this.huntedsList.findIndex(
                hunted => hunted.toLowerCase() === nomeHunted.toLowerCase()
            );
            
            if (indiceHunted === -1) {
                return `❌ "${nomeHunted}" não está na lista de hunteds!
📋 Use !hunteds para ver a lista atual
💡 Nomes devem ser exatos (incluindo espaços e capitalização)`;
            }

            // Obter nome original para exibição
            const nomeOriginal = this.huntedsList[indiceHunted];
            
            // Remover da lista
            this.huntedsList.splice(indiceHunted, 1);
            
            // Salvar no arquivo
            this.salvarHuntedsList();
            
            // Atualizar canal Hunteds
            await this.atualizarCanalHunteds();

            return `✅ Hunted removido com sucesso!
🎯 Nome removido: ${nomeOriginal}
📊 Total de hunteds: ${this.huntedsList.length}
🔄 Canal Hunteds atualizado`;

        } catch (error: any) {
            console.log('❌ Erro no comando !delhunted:', error.message);
            return `❌ Erro ao remover hunted: ${error.message}`;
        }
    }

    private async processarComandoHunteds(comando: string, remetente: any): Promise<string> {
        try {
            // Atualizar canal Hunteds manualmente
            await this.atualizarCanalHunteds();
            
            const huntedsOnline = await this.buscarHuntedsOnline();
            
            let resposta = `✅ Canal Hunteds atualizado!
🎯 Hunteds monitorados: ${this.huntedsList.length}
🔥 Hunteds online: ${huntedsOnline.length}
🌍 Mundo: Kalibra

`;

            // Adicionar lista completa de hunteds
            if (this.huntedsList.length > 0) {
                resposta += `📋 [b]LISTA COMPLETA DE HUNTEDS:[/b]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
                
                // Separar hunteds online e offline
                const huntedsOnlineNomes = huntedsOnline.map(h => h.name.toLowerCase());
                
                for (let i = 0; i < this.huntedsList.length; i++) {
                    const hunted = this.huntedsList[i];
                    const isOnline = huntedsOnlineNomes.includes(hunted.toLowerCase());
                    const status = isOnline ? '[color=GREEN][b]🟢 ONLINE[/b][/color]' : '[color=RED]🔴 OFFLINE[/color]';
                    const numero = (i + 1).toString().padStart(2, '0');
                    
                    // Se estiver online, buscar informações detalhadas
                    if (isOnline) {
                        const huntedData = huntedsOnline.find(h => h.name.toLowerCase() === hunted.toLowerCase());
                        if (huntedData) {
                            resposta += `${numero}. [b]${hunted}[/b] ${status}
     📊 Level: ${huntedData.level || '?'} | ⚔️ ${huntedData.vocation || 'Unknown'}
`;
                        } else {
                            resposta += `${numero}. [b]${hunted}[/b] ${status}
`;
                        }
                    } else {
                        resposta += `${numero}. [b]${hunted}[/b] ${status}
`;
                    }
                }
                
                resposta += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
            } else {
                resposta += `📋 [color=orange]Nenhum hunted na lista[/color]
� Use !addhunted [nome] para adicionar hunteds

`;
            }
            
            resposta += `� Notificações: ${this.notificacoesHuntedsAtivas ? '[color=green]ATIVAS[/color]' : '[color=red]DESATIVADAS[/color]'}
📡 Fonte: TibiaData v4
🔄 Atualização automática: A cada 1 minuto

💡 [b]COMANDOS DISPONÍVEIS:[/b]
📋 !addhunted [nome] - Adicionar hunted([i]apenas lideres ou adms podem usar[/i])
🗑️ !delhunted [nome] - Remover hunted([i]apenas lideres ou adms podem usar[/i])
🔔 !alertas on/off - Ativar/desativar notificações([i]apenas lideres ou adms podem usar[/i])
📊 !alertas - Ver status das notificações`;

            return resposta;

        } catch (error: any) {
            console.log('❌ Erro no comando !hunteds:', error.message);
            return `❌ Erro ao processar hunteds: ${error.message}`;
        }
    }

    private async processarComandoHuntedAlertas(ativar: boolean, remetente: any): Promise<string> {
        try {
            this.notificacoesHuntedsAtivas = ativar;
            
            const status = ativar ? 'ativadas' : 'desativadas';
            const emoji = ativar ? '🔔' : '🔕';
            
            console.log(`${emoji} Notificações de hunteds ${status} por usuário: ${remetente.clientNickname || 'Desconhecido'}`);
            
            return `✅ Notificações de hunteds ${status}!
${emoji} Status: ${ativar ? 'ATIVAS' : 'DESATIVADAS'}

💡 Configuração aplicada globalmente para todos os usuários
🎯 Use !alertas para verificar status atual
📋 Use !addhunted [nome] para gerenciar lista de hunteds`;

        } catch (error: any) {
            console.log('❌ Erro no comando de alertas de hunteds:', error.message);
            return `❌ Erro ao ${ativar ? 'ativar' : 'desativar'} alertas: ${error.message}`;
        }
    }

    private async processarComandoHuntedAlertasStatus(remetente: any): Promise<string> {
        try {
            const status = this.notificacoesHuntedsAtivas ? 'ATIVAS' : 'DESATIVADAS';
            const emoji = this.notificacoesHuntedsAtivas ? '🔔' : '🔕';
            const cor = this.notificacoesHuntedsAtivas ? 'green' : 'red';
            
            return `${emoji} [b]Status das Notificações de Hunteds[/b]

[color=${cor}]${status}[/color]

📊 [b]Informações:[/b]
🎯 Hunteds monitorados: ${this.huntedsList.length}
🌍 Mundo: Kalibra
🔄 Verificação: A cada 1 minuto
📡 Fonte: TibiaData v4

💡 [b]Comandos:[/b]
🔔 !alertas on - Ativar notificações
🔕 !alertas off - Desativar notificações
📋 !addhunted [nome] - Adicionar hunted
🗑️ !delhunted [nome] - Remover hunted
📊 !hunteds - Atualizar lista manual

⚠️ [i]Notificações são enviadas para todos os usuários conectados quando um hunted fica online.[/i]`;

        } catch (error: any) {
            console.log('❌ Erro no comando de status de alertas:', error.message);
            return `❌ Erro ao verificar status: ${error.message}`;
        }
    }

    // ========================================
    // SISTEMA DE FRIENDS
    // ========================================

    private async processarComandoAddFriend(comando: string, remetente: any): Promise<string> {
        try {
            const partes = comando.trim().split(' ');
            
            if (partes.length < 2) {
                return `❌ Formato incorreto!
📋 Use: !addfriend [nome do personagem]
💡 Exemplos:
   !addfriend Jackson Knight
   !addfriend Player Name (suporta nomes compostos)`;
            }

            // Pegar nome do personagem (pode ter espaços)
            const nomeFriend = partes.slice(1).join(' ');
            
            // Verificar se o nome é válido
            if (nomeFriend.length < 2) {
                return `❌ Nome muito curto!
💡 O nome deve ter pelo menos 2 caracteres`;
            }

            // Verificar se já existe na lista (case insensitive)
            const nomeExistente = this.friendsList.find(
                friend => friend.toLowerCase() === nomeFriend.toLowerCase()
            );
            
            if (nomeExistente) {
                return `❌ "${nomeExistente}" já está na lista de friends!
📋 Use !friends para ver a lista atualizada`;
            }

            // Adicionar à lista (mantém capitalização original)
            this.friendsList.push(nomeFriend);
            
            // Salvar no arquivo
            this.salvarFriendsList();

            return `✅ Friend adicionado com sucesso!
👥 Nome: ${nomeFriend}
📊 Total de friends: ${this.friendsList.length}`;

        } catch (error: any) {
            console.log('❌ Erro no comando !addfriend:', error.message);
            return `❌ Erro ao adicionar friend: ${error.message}`;
        }
    }

    private async processarComandoDelFriend(comando: string, remetente: any): Promise<string> {
        try {
            const partes = comando.trim().split(' ');
            
            if (partes.length < 2) {
                return `❌ Formato incorreto!
📋 Use: !delfriend [nome do personagem]
💡 Exemplos:
   !delfriend Jackson Knight
   !delfriend Player Name (suporta nomes compostos)`;
            }

            // Pegar nome do personagem (pode ter espaços)
            const nomeFriend = partes.slice(1).join(' ');
            
            // Encontrar o friend na lista (case insensitive)
            const indiceFriend = this.friendsList.findIndex(
                friend => friend.toLowerCase() === nomeFriend.toLowerCase()
            );
            
            if (indiceFriend === -1) {
                return `❌ "${nomeFriend}" não está na lista de friends!
📋 Use !friends para ver a lista atual
💡 Nomes devem ser exatos (incluindo espaços e capitalização)`;
            }

            // Obter nome original para exibição
            const nomeOriginal = this.friendsList[indiceFriend];
            
            // Remover da lista
            this.friendsList.splice(indiceFriend, 1);
            
            // Salvar no arquivo
            this.salvarFriendsList();

            return `✅ Friend removido com sucesso!
👥 Nome removido: ${nomeOriginal}
📊 Total de friends: ${this.friendsList.length}`;

        } catch (error: any) {
            console.log('❌ Erro no comando !delfriend:', error.message);
            return `❌ Erro ao remover friend: ${error.message}`;
        }
    }

    private async processarComandoFriends(comando: string, remetente: any): Promise<string> {
        try {
            let resposta = `✅ Lista de Friends atualizada!
👥 Friends monitorados: ${this.friendsList.length}
🌍 Mundo: Kalibra

`;

            // Adicionar lista completa de friends
            if (this.friendsList.length > 0) {
                resposta += `📋 [b]LISTA COMPLETA DE FRIENDS:[/b]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
                
                for (let i = 0; i < this.friendsList.length; i++) {
                    const friend = this.friendsList[i];
                    const numero = (i + 1).toString().padStart(2, '0');
                    resposta += `${numero}. [b]${friend}[/b] [color=green]👥 FRIEND[/color]
`;
                }
                
                resposta += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
            } else {
                resposta += `📋 [color=orange]Nenhum friend na lista[/color]
💡 Use !addfriend [nome] para adicionar friends

`;
            }
            
            resposta += `📡 Fonte: Sistema AliBot
🔄 Monitoramento de mortes ativo

💡 [b]COMANDOS DISPONÍVEIS:[/b]
📋 !addfriend [nome] - Adicionar friend manualmente
🗑️ !delfriend [nome] - Remover friend
📊 !friends - Ver lista de friends
🔄 !syncfriends - Sincronizar com canal Friends`;

            return resposta;

        } catch (error: any) {
            console.log('❌ Erro no comando !friends:', error.message);
            return `❌ Erro ao processar friends: ${error.message}`;
        }
    }

    private async processarComandoSyncFriends(comando: string, remetente: any): Promise<string> {
        try {
            console.log(`🔄 Comando !syncfriends executado por: ${remetente.clientNickname || 'Desconhecido'}`);
            
            const listAnterior = [...this.friendsList];
            const totalAnterior = listAnterior.length;
            
            // Sincronizar com o canal Friends
            await this.sincronizarFriendsDoCanal();
            
            const totalAtual = this.friendsList.length;
            const novosAdicionados = totalAtual - totalAnterior;
            
            let resposta = `🔄 [b]SINCRONIZAÇÃO DE FRIENDS CONCLUÍDA![/b]

📊 [b]Resultado:[/b]
👥 Friends antes: ${totalAnterior}
👥 Friends agora: ${totalAtual}
➕ Novos adicionados: ${novosAdicionados}

`;

            if (novosAdicionados > 0) {
                resposta += `✅ [color=green]${novosAdicionados} novo(s) friend(s) encontrado(s) no canal![/color]

📋 [b]Novos friends adicionados:[/b]
`;
                const novosNomes = this.friendsList.slice(-novosAdicionados);
                novosNomes.forEach((nome, index) => {
                    resposta += `${index + 1}. ${nome}
`;
                });
                
                resposta += `
💾 Lista salva automaticamente em friends-list.json`;
            } else {
                resposta += `✅ [color=blue]Lista já estava atualizada - nenhum novo friend encontrado[/color]`;
            }
            
            resposta += `

💡 [b]Comandos relacionados:[/b]
📋 !friends - Ver lista completa
🔄 !syncfriends - Sincronizar novamente
📋 !addfriend [nome] - Adicionar manualmente
🗑️ !delfriend [nome] - Remover friend`;

            return resposta;

        } catch (error: any) {
            console.log('❌ Erro no comando !syncfriends:', error.message);
            return `❌ Erro ao sincronizar friends: ${error.message}

💡 Verifique se o ID do canal Friends está correto
🔧 Use !listarcanais para ver IDs disponíveis`;
        }
    }

    private salvarFriendsList(): void {
        try {
            const filePath = path.join(__dirname, '..', 'friends-list.json');
            const data = JSON.stringify(this.friendsList, null, 2);
            fs.writeFileSync(filePath, data, 'utf8');
            
            console.log(`💾 Friends salvos: ${this.friendsList.length} friends`);
        } catch (error: any) {
            console.log(`❌ Erro ao salvar friends: ${error.message}`);
        }
    }

    private carregarFriendsList(): void {
        try {
            const filePath = path.join(__dirname, '..', 'friends-list.json');
            if (fs.existsSync(filePath)) {
                console.log('👥 Carregando lista de friends...');
                const data = fs.readFileSync(filePath, 'utf8');
                this.friendsList = JSON.parse(data);
                
                console.log(`✅ Carregados ${this.friendsList.length} friends`);
            } else {
                console.log('👥 Arquivo de friends não encontrado, criando vazio...');
                this.friendsList = [];
                this.salvarFriendsList();
            }
        } catch (error: any) {
            console.log(`❌ Erro ao carregar friends: ${error.message}`);
            console.log('🔄 Inicializando lista vazia...');
            this.friendsList = [];
            this.salvarFriendsList();
        }
    }

    // ========================================
    // SISTEMA DE MONITORAMENTO DE MORTES
    // ========================================

    private carregarDeathMonitorData(): void {
        try {
            const filePath = path.join(__dirname, '..', 'mortes-cache.json');
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                const cacheData = JSON.parse(data);
                this.deathMonitorData = new Map(Object.entries(cacheData));
                console.log(`💀 Cache de mortes carregado: ${this.deathMonitorData.size} personagens`);
            } else {
                this.deathMonitorData = new Map();
                this.salvarDeathMonitorData();
                console.log('💀 Arquivo mortes-cache.json criado');
            }
        } catch (error: any) {
            console.log('❌ Erro ao carregar mortes-cache.json:', error.message);
            this.deathMonitorData = new Map();
        }
    }

    private salvarDeathMonitorData(): void {
        try {
            const filePath = path.join(__dirname, '..', 'mortes-cache.json');
            const cacheData = Object.fromEntries(this.deathMonitorData);
            fs.writeFileSync(filePath, JSON.stringify(cacheData, null, 2));
        } catch (error: any) {
            console.log('❌ Erro ao salvar mortes-cache.json:', error.message);
        }
    }

    private async verificarMortes(): Promise<void> {
        try {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`💀 [${timestamp}] Verificando mortes de Friends & Hunteds...`);

            // Obter personagens dos canais Friends e Hunteds
            const friendsDoCanal = await this.obterPersonagensDoCanal('friends');
            const huntedsDoCanal = await this.obterPersonagensDoCanal('hunteds');
            
            // Combinar friends e hunteds dos canais em uma lista única (sem duplicatas)
            const todosPersonagens: string[] = [];
            const personagensUnicos = new Set<string>();
            
            [...friendsDoCanal, ...huntedsDoCanal].forEach(personagem => {
                if (!personagensUnicos.has(personagem)) {
                    personagensUnicos.add(personagem);
                    todosPersonagens.push(personagem);
                }
            });

            if (todosPersonagens.length === 0) {
                console.log('💀 Nenhum personagem para monitorar (canais friends/hunteds vazios)');
                return;
            }

            let mortesEncontradas = 0;

            for (const personagem of todosPersonagens) {
                try {
                    const novasMortes = await this.verificarMortesPersonagem(personagem);
                    if (novasMortes.length > 0) {
                        mortesEncontradas += novasMortes.length;
                        const tipoPersonagem = friendsDoCanal.includes(personagem) ? 'Friend' : 'Hunted';
                        await this.notificarMortes(personagem, novasMortes, tipoPersonagem);
                    }
                } catch (error: any) {
                    console.log(`⚠️ Erro ao verificar mortes de ${personagem}:`, error.message);
                }
            }

            if (mortesEncontradas > 0) {
                console.log(`💀 [${timestamp}] ${mortesEncontradas} nova(s) morte(s) encontrada(s)`);
                this.salvarDeathMonitorData();
            } else {
                console.log(`💀 [${timestamp}] Nenhuma nova morte encontrada`);
            }

        } catch (error: any) {
            console.log('❌ Erro geral no monitoramento de mortes:', error.message);
        }
    }

    private async verificarMortesPersonagem(nomePersonagem: string): Promise<PlayerDeath[]> {
        try {
            // Buscar dados do personagem na API do Tibia
            const response = await axios.get(`https://api.tibiadata.com/v4/character/${encodeURIComponent(nomePersonagem)}`);
            
            if (!response.data || !response.data.character) {
                console.log(`⚠️ Personagem ${nomePersonagem} não encontrado na API`);
                return [];
            }

            const deaths = response.data.character.deaths || [];
            if (deaths.length === 0) {
                return [];
            }

            // Obter dados do cache
            const cacheData = this.deathMonitorData.get(nomePersonagem) || {
                character: nomePersonagem,
                lastChecked: new Date(0).toISOString(), // Época inicial
                recentDeaths: []
            };

            const ultimaVerificacao = new Date(cacheData.lastChecked);
            const agora = new Date();
            const limiteTempoMorte = this.LIMITE_TEMPO_MORTE_MINUTOS * 60 * 1000; // Converter minutos para millisegundos
            const novasMortes: PlayerDeath[] = [];

            // Verificar mortes que aconteceram após a última verificação E dentro do limite de tempo
            for (const death of deaths) {
                const timeString = death.time;
                const deathDate = this.parseDeathTime(timeString);
                
                // Calcular tempo desde a morte
                const tempoDesDaMorte = agora.getTime() - deathDate.getTime();
                const minutosDesDaMorte = Math.round(tempoDesDaMorte / 60000);
                
                // Verificar se a morte:
                // 1. Aconteceu após a última verificação
                // 2. Aconteceu dentro do limite de tempo configurado
                if (deathDate > ultimaVerificacao && tempoDesDaMorte <= limiteTempoMorte) {
                    console.log(`💀 ✅ Morte válida: ${response.data.character.character.name} - ${minutosDesDaMorte} min atrás (dentro do limite de ${this.LIMITE_TEMPO_MORTE_MINUTOS} min)`);
                    
                    novasMortes.push({
                        character: {
                            name: response.data.character.character.name,
                            level: response.data.character.character.level,
                            vocation: response.data.character.character.vocation
                        },
                        time: timeString,
                        reason: death.reason || 'Causa desconhecida'
                    });
                }
            }

            // Atualizar cache
            this.deathMonitorData.set(nomePersonagem, {
                character: nomePersonagem,
                lastChecked: new Date().toISOString(),
                recentDeaths: deaths.slice(0, 5) // Manter apenas as 5 mortes mais recentes
            });

            return novasMortes;

        } catch (error: any) {
            console.log(`❌ Erro ao verificar mortes de ${nomePersonagem}:`, error.message);
            return [];
        }
    }

    private parseDeathTime(timeString: string): Date {
        try {
            // Remover timezone para parsing mais confiável
            let cleanTime = timeString.replace(/ CET$/, '').replace(/ CEST$/, '');
            
            // Tentar diferentes formatos
            let deathDate: Date;
            
            // Primeiro tentar parsing direto
            deathDate = new Date(cleanTime);
            
            // Se não funcionou, tentar com formatos alternativos
            if (isNaN(deathDate.getTime())) {
                // Tentar formato alternativo: "Dec 25, 2023 14:30:45"
                cleanTime = cleanTime.replace(/(\w{3} \d{1,2}) (\d{4}),/, '$1, $2');
                deathDate = new Date(cleanTime);
            }
            
            // Validar se a data faz sentido (não muito no futuro, não muito no passado)
            const agora = new Date();
            const umAnoAtras = new Date(agora.getTime() - 365 * 24 * 60 * 60 * 1000);
            const umaHoraNaFrente = new Date(agora.getTime() + 60 * 60 * 1000);
            
            if (isNaN(deathDate.getTime()) || deathDate < umAnoAtras || deathDate > umaHoraNaFrente) {
                return new Date(0);
            }
            
            return deathDate;
            
        } catch (error: any) {
            console.log(`❌ Erro ao parsear tempo de morte "${timeString}":`, error.message);
            return new Date(0);
        }
    }

    private async notificarMortes(personagem: string, mortes: PlayerDeath[], tipoPersonagem: string): Promise<void> {
        try {
            for (const morte of mortes) {
                const emoji = tipoPersonagem === 'Friend' ? '👥' : '🎯';
                const cor = tipoPersonagem === 'Friend' ? 'green' : 'red';
                
                // Formatar a data da morte para padrão brasileiro: DD/MM/AAAA HH:MM
                const dataFormatada = this.formatarDataMorte(morte.time);
                
                const mensagem = `💀 MORTE DETECTADA! 💀

${emoji} [color=${cor}]${tipoPersonagem}[/color]: [b]${morte.character.name}[/b]
⚔️ Level: ${morte.character.level} ${morte.character.vocation}
🕐 Horário: ${dataFormatada}
💥 Causa: ${morte.reason}

⚠️ [i]Monitoramento automático ativo[/i]`;

                // Enviar poke para todos os usuários online
                await this.enviarPokeParaTodos(mensagem);
                
                // Adicionar morte na deathlist
                await this.adicionarMorteNaDeathlist(morte, tipoPersonagem as 'Friend' | 'Hunted');
            }
        } catch (error: any) {
            console.log('❌ Erro ao notificar mortes e atualizar deathlist:', error.message);
        }
    }

    private async obterPersonagensDoCanal(tipoCanal: 'friends' | 'hunteds'): Promise<string[]> {
        try {
            if (tipoCanal === 'hunteds') {
                // Retornar lista completa de hunteds para verificação de mortes
                return [...this.huntedsList];
            } else if (tipoCanal === 'friends') {
                // Primeiro, sincronizar com o canal Friends
                await this.sincronizarFriendsDoCanal();
                // Retornar lista atualizada de friends
                return [...this.friendsList];
            } else {
                return [];
            }
            
        } catch (error: any) {
            console.log(`❌ Erro ao obter personagens do canal ${tipoCanal}:`, error.message);
            return [];
        }
    }

    private async sincronizarFriendsDoCanal(): Promise<void> {
        try {
            const friendsChannelId = "9"; // ID do canal Friends - ajustar conforme necessário
            
            console.log(`👥 Sincronizando lista de friends com canal (ID: ${friendsChannelId})...`);
            
            // Verificar se o canal existe
            let channelInfo: any;
            try {
                channelInfo = await this.serverQuery.channelInfo(friendsChannelId);
                console.log(`✅ Canal Friends encontrado: ${(channelInfo as any).channel_name || 'Nome não disponível'}`);
            } catch (channelError: any) {
                console.log(`❌ Erro ao verificar canal Friends (ID: ${friendsChannelId}): ${channelError.message}`);
                console.log('💡 Verifique se o ID do canal está correto');
                return;
            }

            // Extrair nomes do canal
            const nomesDoCanal = await this.extrairNomesDoCanal(friendsChannelId);
            
            if (nomesDoCanal.length === 0) {
                console.log('📭 Nenhum nome encontrado no canal Friends');
                return;
            }

            // Adicionar apenas nomes novos à lista
            let novosAdicionados = 0;
            const listOriginal = [...this.friendsList];

            for (const nome of nomesDoCanal) {
                // Verificar se já existe (case insensitive)
                const jaExiste = this.friendsList.some(friend => 
                    friend.toLowerCase() === nome.toLowerCase()
                );

                if (!jaExiste) {
                    this.friendsList.push(nome);
                    novosAdicionados++;
                    console.log(`   ➕ Novo friend adicionado: ${nome}`);
                }
            }

            // Salvar apenas se houve mudanças
            if (novosAdicionados > 0) {
                this.salvarFriendsList();
                console.log(`✅ Sincronização concluída: ${novosAdicionados} novo(s) friend(s) adicionado(s)`);
                console.log(`📊 Total de friends: ${this.friendsList.length} (era ${listOriginal.length})`);
            } else {
                console.log(`✅ Sincronização concluída: Lista já está atualizada (${this.friendsList.length} friends)`);
            }

        } catch (error: any) {
            console.log('❌ Erro ao sincronizar friends do canal:', error.message);
        }
    }

    private async extrairNomesDoCanal(channelId: string): Promise<string[]> {
        try {
            const channelInfo = await this.serverQuery.channelInfo(channelId);
            const descricao = (channelInfo as any).channel_description || '';
            
            if (!descricao) {
                console.log('⚠️ Descrição do canal Friends está vazia');
                return [];
            }

            console.log(`📝 Analisando descrição do canal (${descricao.length} caracteres)...`);
            
            // Buscar diferentes padrões comuns em canais Friends
            const nomes: string[] = [];
            
            // Padrão 1: "🟢 Level XXX Nome do Personagem (Vocação)"
            const regex1 = /🟢[^(]*Level\s+\d+\s+([^(]+)/gi;
            let match;
            while ((match = regex1.exec(descricao)) !== null) {
                const nome = match[1].trim();
                if (nome && nome.length >= 2 && !nomes.includes(nome)) {
                    nomes.push(nome);
                }
            }

            // Padrão 2: "[b]Nome do Personagem[/b]" 
            const regex2 = /\[b\]([^[\]]+)\[\/b\]/gi;
            while ((match = regex2.exec(descricao)) !== null) {
                const nome = match[1].trim();
                // Filtrar nomes válidos (não números, não muito curtos)
                if (nome && nome.length >= 2 && !/^\d+$/.test(nome) && !nomes.includes(nome)) {
                    nomes.push(nome);
                }
            }

            // Padrão 3: Links de cliente "client://0/uid]Nome[/url]"
            const regex3 = /client:\/\/[^]]+\]([^[]+)\[\/url\]/gi;
            while ((match = regex3.exec(descricao)) !== null) {
                const nome = match[1].trim();
                if (nome && nome.length >= 2 && !nomes.includes(nome)) {
                    nomes.push(nome);
                }
            }

            // Remover duplicatas e filtrar nomes válidos
            const nomesUnicos: string[] = [];
            const nomesVistos = new Set<string>();
            
            for (const nome of nomes) {
                if (!nomesVistos.has(nome)) {
                    nomesVistos.add(nome);
                    nomesUnicos.push(nome);
                }
            }
            
            const nomesLimpos = nomesUnicos.filter(nome => {
                // Filtrar apenas nomes que parecem ser nomes de personagens
                return nome.length >= 2 && 
                       nome.length <= 30 && 
                       !/^(level|online|offline|vocação|guild)$/i.test(nome) &&
                       !/^\d+$/.test(nome);
            });

            console.log(`🔍 Nomes extraídos do canal: ${nomesLimpos.join(', ')}`);
            return nomesLimpos;

        } catch (error: any) {
            console.log(`❌ Erro ao extrair nomes do canal ${channelId}:`, error.message);
            return [];
        }
    }

    private async enviarPokeParaTodos(mensagem: string): Promise<void> {
        try {
            if (!this.sistemaAtivo || !this.serverQuery) {
                console.log('⚠️ Sistema inativo - não foi possível enviar pokes');
                return;
            }

            // Obter lista de clientes online
            const clientes = await this.serverQuery.clientList();
            
            // Filtrar apenas clientes reais (não bots/query)
            const clientesReais = clientes.filter((cliente: any) => 
                cliente.type === 0 && // Tipo 0 = cliente normal
                !cliente.clientNickname?.includes('ServerQuery') && // Não é ServerQuery
                !cliente.clientNickname?.includes('Bot') // Não é Bot
            );

            if (clientesReais.length === 0) {
                console.log('📭 Nenhum cliente real online para poke');
                return;
            }

            console.log(`📢 Enviando pokes para ${clientesReais.length} cliente(s) online...`);
            
            for (const cliente of clientesReais) {
                try {
                    // Enviar poke para cada cliente
                    await this.serverQuery.clientPoke(cliente.clid, mensagem);
                    console.log(`   ✅ Poke enviado para: ${cliente.clientNickname || cliente.nickname}`);
                } catch (error: any) {
                    console.log(`   ❌ Erro ao enviar poke para cliente ${cliente.clid}:`, error.message);
                }
            }

            console.log(`📢 Total de pokes enviados: ${clientesReais.length}`);

        } catch (error: any) {
            console.log('❌ Erro ao enviar pokes para todos:', error.message);
        }
    }

    private async enviarMasspokeParaTodos(mensagem: string): Promise<void> {
        try {
            if (!this.sistemaAtivo || !this.serverQuery) {
                console.log('⚠️ Sistema inativo - não foi possível enviar pokes');
                return;
            }

            // Obter lista de clientes online
            const clientes = await this.serverQuery.clientList();
            
            // Filtrar apenas clientes reais (não bots/query)
            const clientesReais = clientes.filter((cliente: any) => 
                cliente.type === 0 && // Tipo 0 = cliente normal
                !cliente.clientNickname?.includes('ServerQuery') && // Não é ServerQuery
                !cliente.clientNickname?.includes('Bot') // Não é Bot
            );

            if (clientesReais.length === 0) {
                console.log('📭 Nenhum cliente real online para poke');
                return;
            }

            console.log(`📢 Enviando pokes para ${clientesReais.length} cliente(s) online...`);
            
            for (const cliente of clientesReais) {
                try {
                    // Enviar poke para cada cliente
                    await this.serverQuery.clientPoke(cliente.clid, mensagem);
                    console.log(`   ✅ Poke enviado para: ${cliente.clientNickname || cliente.nickname}`);
                } catch (error: any) {
                    console.log(`   ❌ Erro ao enviar poke para cliente ${cliente.clid}:`, error.message);
                }
            }

            console.log(`📢 Pokes enviados para ${clientesReais.length} usuário(s)`);

        } catch (error: any) {
            console.log('❌ Erro ao enviar pokes para todos:', error.message);
        }
    }

    // ========================================
    // SISTEMA DE DEATHLIST
    // ========================================

    private inicializarSistemaDeathlist(): void {
        console.log('💀 Inicializando sistema de Deathlist...');
        
        // Carregar lista de mortes do dia
        this.carregarDeathlistDoDia();
        
        // Configurar reset diário às 06:00
        this.configurarResetDiarioDeathlist();
        
        console.log('✅ Sistema de Deathlist inicializado');
    }

    private carregarDeathlistDoDia(): void {
        try {
            const filePath = path.join(__dirname, '..', 'deathlist-daily.json');
            
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                const savedData = JSON.parse(data);
                
                // Verificar se os dados são do dia atual
                const hoje = new Date();
                const dataArquivo = new Date(savedData.dataReset || '1970-01-01');
                
                // Se for do mesmo dia, carregar a lista
                if (hoje.toDateString() === dataArquivo.toDateString()) {
                    this.deathListEntries = savedData.mortes || [];
                    this.ultimoResetDeathlist = new Date(savedData.dataReset);
                    console.log(`💀 Deathlist carregada: ${this.deathListEntries.length} morte(s) do dia`);
                } else {
                    // Se não for do mesmo dia, limpar lista
                    this.deathListEntries = [];
                    this.ultimoResetDeathlist = hoje;
                    this.salvarDeathlistDoDia();
                    console.log('💀 Nova deathlist criada para hoje');
                }
            } else {
                // Arquivo não existe, criar novo
                this.deathListEntries = [];
                this.ultimoResetDeathlist = new Date();
                this.salvarDeathlistDoDia();
                console.log('💀 Arquivo deathlist-daily.json criado');
            }
        } catch (error: any) {
            console.log('❌ Erro ao carregar deathlist do dia:', error.message);
            this.deathListEntries = [];
            this.ultimoResetDeathlist = new Date();
        }
    }

    private salvarDeathlistDoDia(): void {
        try {
            const filePath = path.join(__dirname, '..', 'deathlist-daily.json');
            const data = {
                dataReset: this.ultimoResetDeathlist.toISOString(),
                totalMortes: this.deathListEntries.length,
                mortes: this.deathListEntries
            };
            
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`💾 Deathlist salva: ${this.deathListEntries.length} morte(s)`);
        } catch (error: any) {
            console.log('❌ Erro ao salvar deathlist do dia:', error.message);
        }
    }

    private configurarResetDiarioDeathlist(): void {
        // Limpar timer anterior se existir
        if (this.intervalResetDeathlist) {
            clearTimeout(this.intervalResetDeathlist);
        }

        // Calcular próximo reset (06:00 do próximo dia se já passou das 06:00 hoje)
        const agora = new Date();
        const proximoReset = new Date();
        proximoReset.setHours(6, 0, 0, 0);

        // Se já passou das 06:00 hoje, definir para amanhã
        if (agora.getHours() >= 6) {
            proximoReset.setDate(proximoReset.getDate() + 1);
        }

        const tempoAteReset = proximoReset.getTime() - agora.getTime();
        
        console.log(`⏰ Próximo reset da Deathlist: ${proximoReset.toLocaleString('pt-BR')}`);
        
        // Configurar timeout para o reset
        this.intervalResetDeathlist = setTimeout(() => {
            this.resetarDeathlistDiaria();
            // Reconfigurar para o próximo dia
            this.configurarResetDiarioDeathlist();
        }, tempoAteReset);
    }

    private resetarDeathlistDiaria(): void {
        console.log('🌅 06:00 - Resetando Deathlist diária...');
        
        // Fazer backup da lista anterior
        const backupPath = path.join(__dirname, '..', `deathlist-backup-${new Date().toISOString().split('T')[0]}.json`);
        try {
            const backupData = {
                data: this.ultimoResetDeathlist.toISOString().split('T')[0],
                totalMortes: this.deathListEntries.length,
                mortes: this.deathListEntries
            };
            fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
            console.log(`📁 Backup criado: ${backupPath}`);
        } catch (error: any) {
            console.log('⚠️ Erro ao criar backup da deathlist:', error.message);
        }

        // Resetar lista
        this.deathListEntries = [];
        this.ultimoResetDeathlist = new Date();
        
        // Salvar lista limpa
        this.salvarDeathlistDoDia();
        
        // Atualizar canal
        this.atualizarCanalDeathlist();
        
        console.log('✅ Deathlist resetada para novo dia');
    }

    private async adicionarMorteNaDeathlist(morte: PlayerDeath, tipoPersonagem: 'Friend' | 'Hunted'): Promise<void> {
        try {
            const novaEntrada: DeathListEntry = {
                nome: morte.character.name,
                level: morte.character.level,
                vocacao: morte.character.vocation,
                horario: this.formatarDataMorte(morte.time),
                causa: morte.reason,
                tipo: tipoPersonagem,
                timestamp: new Date()
            };

            // Adicionar ao início da lista (mais recente primeiro)
            this.deathListEntries.unshift(novaEntrada);
            
            // Limitar a 50 mortes por dia para não sobrecarregar
            if (this.deathListEntries.length > 50) {
                this.deathListEntries = this.deathListEntries.slice(0, 50);
            }

            // Salvar alterações
            this.salvarDeathlistDoDia();
            
            // Atualizar canal
            await this.atualizarCanalDeathlist();
            
            console.log(`💀 Morte adicionada à Deathlist: ${morte.character.name} (${tipoPersonagem})`);
            
        } catch (error: any) {
            console.log('❌ Erro ao adicionar morte na deathlist:', error.message);
        }
    }

    private async atualizarCanalDeathlist(): Promise<void> {
        if (!this.serverQuery) {
            console.log('⚠️ ServerQuery não conectado - não é possível atualizar canal Deathlist');
            return;
        }

        try {
            const deathlistChannelId = "11"; // ID do canal Deathlist - ajustar conforme necessário
            
            console.log(`💀 Atualizando canal Deathlist (ID: ${deathlistChannelId})...`);
            
            // Verificar se o canal existe primeiro
            try {
                const channelInfo = await this.serverQuery.channelInfo(deathlistChannelId);
                console.log(`✅ Canal Deathlist encontrado: ${(channelInfo as any).channel_name || 'Nome não disponível'}`);
            } catch (channelError: any) {
                console.log(`❌ Erro ao verificar canal Deathlist (ID: ${deathlistChannelId}): ${channelError.message}`);
                console.log('💡 Verifique se o ID do canal está correto');
                return;
            }
            
            // Banner fixo
            let descricao = `[img]https://i.imgur.com/UXN95sj.png[/img]

💀 DEATHLIST - MORTES DO DIA 💀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 Mundo: Kalibra
📅 Data: ${new Date().toLocaleDateString('pt-BR')}
⏰ Último reset: ${new Date().toLocaleDateString('pt-BR')} às 06:00

`;

            if (this.deathListEntries.length === 0) {
                descricao += `🕊️ [color=green]Nenhuma morte registrada hoje[/color]
💡 As mortes aparecerão aqui automaticamente
🔄 Lista reseta diariamente às 06:00 AM

✨ [i]Sistema automático de monitoramento ativo[/i]`;
            } else {
                descricao += `💀 [b]${this.deathListEntries.length} MORTE(S) REGISTRADA(S):[/b]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

                // Adicionar cada morte à lista
                this.deathListEntries.forEach((morte, index) => {
                    const numero = (index + 1).toString().padStart(2, '0');
                    const emojiTipo = morte.tipo === 'Friend' ? '👥' : '🎯';
                    const corTipo = morte.tipo === 'Friend' ? 'green' : 'red';
                    
                    descricao += `${numero}. [color=${corTipo}]${emojiTipo} ${morte.tipo}[/color]: [b]${morte.nome}[/b]
     📊 Level ${morte.level} ${morte.vocacao}
     🕐 ${morte.horario}
     💥 ${morte.causa}

`;
                });

                descricao += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 [b]ESTATÍSTICAS DO DIA:[/b]
💀 Total de mortes: ${this.deathListEntries.length}
👥 Friends: ${this.deathListEntries.filter(m => m.tipo === 'Friend').length}
🎯 Hunteds: ${this.deathListEntries.filter(m => m.tipo === 'Hunted').length}
🔄 Próximo reset: Amanhã às 06:00 AM

🤖 Sistema: AliBot - Monitor Automático
📡 Fonte: TibiaData v4`;
            }

            // Atualizar canal
            console.log(`📝 Preparando para atualizar descrição do canal (${descricao.length} caracteres)...`);
            
            await this.serverQuery.channelEdit(deathlistChannelId, {
                channel_description: descricao
            });
            
            console.log(`✅ Canal Deathlist atualizado com sucesso: ${this.deathListEntries.length} morte(s) registrada(s)`);
            
        } catch (error: any) {
            console.log('❌ Erro ao atualizar canal Deathlist:', error.message);
            console.log('📋 Detalhes do erro:', error.stack);
        }
    }

    private async listarCanaisParaDebug(): Promise<void> {
        try {
            if (!this.serverQuery) {
                console.log('⚠️ ServerQuery não conectado');
                return;
            }

            console.log('🔍 Listando canais disponíveis para debug...');
            const channels = await this.serverQuery.channelList();
            
            console.log(`📋 Total de canais encontrados: ${channels.length}`);
            
            channels.forEach((channel: any) => {
                const id = channel.cid || channel.channelId || 'N/A';
                const name = channel.channel_name || channel.channelName || 'Sem nome';
                console.log(`   Canal ID: ${id} - Nome: "${name}"`);
            });
            
            // Tentar encontrar canal com nome similar a "deathlist"
            const deathlistChannel = channels.find((ch: any) => {
                const name = (ch.channel_name || ch.channelName || '').toLowerCase();
                return name.includes('death') || name.includes('morte');
            });
            
            if (deathlistChannel) {
                const id = deathlistChannel.cid || deathlistChannel.channelId;
                const name = deathlistChannel.channel_name || deathlistChannel.channelName;
                console.log(`🎯 Canal Deathlist encontrado: ID=${id}, Nome="${name}"`);
            } else {
                console.log('❌ Nenhum canal com nome relacionado a "death" ou "morte" encontrado');
            }
            
        } catch (error: any) {
            console.log('❌ Erro ao listar canais:', error.message);
        }
    }
}
// Execução principal
async function executarSistemaOtimizado() {
    const sistema = new SistemaHibridoOptimizado();
    await sistema.iniciar();
}

// Auto-execução
if (require.main === module) {
    console.log('🎯 Iniciando Sistema Híbrido Otimizado...');
    executarSistemaOtimizado().catch((error) => {
        console.log('💥 Erro fatal:', error.message);
        process.exit(1);
    });
}

export default SistemaHibridoOptimizado;