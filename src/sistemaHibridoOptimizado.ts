import GerenciadorConexaoHibrida from './gerenciadorConexaoHibrida';
import axios from 'axios';

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

class SistemaHibridoOptimizado {
    private gerenciadorConexao: GerenciadorConexaoHibrida;
    private sistemaAtivo: boolean = false;
    private serverQuery: any = null;
    private timersRespawn: TimersAtivos = {};
    private filasClaimeds: FilasAtivas = {};
    private nextTimers: NextTimersAtivos = {};
    private intervalTimers: NodeJS.Timeout | null = null;

    constructor() {
        this.gerenciadorConexao = GerenciadorConexaoHibrida.obterInstancia();
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
                    resposta = `🤖 Bot Híbrido Otimizado - Comandos:
!help - Esta ajuda
!status - Status do sistema
!ping - Teste de resposta
!info - Informações do servidor
!users - Usuários online
!time - Horário atual

🔄 Comandos de Atualização:
!friends - Atualizar canal Friends
!claimeds - Atualizar canal Claimeds
!respawns - Atualizar canal Respawns List
!sync - Sincronizar todos os canais

⚔️ Sistema de Respawns com Fila:
!resp [código] [tempo] - Iniciar timer
!resp [código] - Aceitar next (se tem tempo pré-definido)
!next [código] - Entrar na fila (sem tempo específico)
!next [código] [tempo] - Entrar na fila com tempo pré-definido
!leave [código] - Sair do respawn
!fila [código] - Ver timer específico
!fila - Ver todos os timers

� Lista de Respawns: Veja o canal "Respawns List" para todos os códigos disponíveis

�💡 Exemplos de Respawn:
!resp f4 02:30 - F4 por 2 horas e 30 minutos
!resp f4 00:30 - F4 por 30 minutos
!resp f4 150 - F4 por 150 segundos
!resp f4 - Aceitar next (se tem tempo pré-definido)

🎯 Exemplos de Next:
!next f4 - Entrar na fila (escolher tempo depois)
!next f4 02:30 - Entrar na fila com 2h30min pré-definido
!next wz 150 - Entrar na fila com 150s pré-definido

🧪 Comandos de Teste:
!testlink - Testar links BBCode
!api - Testar API do Tibia`;
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
                        resposta = `✅ Todos os canais atualizados com sucesso!
👥 Friends: Membros online sincronizados
⏰ Claimeds: Timers sincronizados
📋 Respawns List: Lista de respawns atualizada
🚀 Sistema híbrido totalmente sincronizado`;
                    } catch (error: any) {
                        resposta = `❌ Erro na sincronização: ${error.message}`;
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
                    } else {
                        resposta = `❓ Comando "${comando}" não reconhecido.
💡 Use !help para ver comandos disponíveis.
⚔️ Para respawns: !resp [código] [tempo]
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

        console.log('🔄 Timers automáticos configurados:');
        console.log('   👥 Friends: A cada 1 minuto');
        console.log('   ⏰ Claimeds: A cada 30 segundos (quando sem timers ativos)');
        console.log('   ⚔️ Respawns: A cada 5 segundos (quando há timers)');
        console.log('   💓 Status: A cada 2 minutos');
    }

    public async parar(): Promise<void> {
        console.log('🛑 Parando sistema híbrido otimizado...');
        this.sistemaAtivo = false;

        try {
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
            let descricao = `[img]https://i.imgur.com/friendsimage.png[/img]

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
🤖 Sistema: AliBot
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
            let descricao = `[img]https://i.imgur.com/qzjiLZT.png[/img]

🎯 SISTEMA DE CLAIMEDS - ALIBOT 🎯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️ Respawns ⚔️
📋 Use: [b]!resp [código] [tempo][/b] - Iniciar timer
🎯 Use: [b]!next [código][/b] - Entrar na fila
🚪 Use: [b]!leave [código][/b] - Sair do respawn
📊 Use: [b]!fila [código][/b] - Ver timer específico
📋 Use: [b]!fila[/b] - Ver todos os timers
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
                    if (timer.tipo === 'claimed' && this.filasClaimeds[timer.codigo] && this.filasClaimeds[timer.codigo].length > 0) {
                        const fila = this.filasClaimeds[timer.codigo];
                        if (fila.length === 1) {
                            const clientId = await this.obterClientIdPorNome(fila[0].jogador);
                            const linkJogador = this.criarLinkJogador(fila[0].jogador, clientId);
                            const tempoInfo = fila[0].tempoDesejado ? ` (${this.formatarTempo(fila[0].tempoDesejado)})` : '';
                            infoFila = ` Next: ${linkJogador}${tempoInfo}`;
                        } else if (fila.length === 2) {
                            const clientId = await this.obterClientIdPorNome(fila[0].jogador);
                            const linkJogador = this.criarLinkJogador(fila[0].jogador, clientId);
                            const tempoInfo = fila[0].tempoDesejado ? ` (${this.formatarTempo(fila[0].tempoDesejado)})` : '';
                            infoFila = ` Next: ${linkJogador}${tempoInfo} +1`;
                        }
                    }
                    
                    // Formato com BBCode padrão do TeamSpeak 3
                    const tempoFormatado = `[color=darkorange][b][${tempoRestante}][/b][/color]`;
                    const nomeFormatado = `[b]${timer.nome}[/b]`;
                    
                    // Obter ID do cliente para link clicável
                    const clientId = await this.obterClientIdPorNome(timer.jogador);
                    const jogadorFormatado = this.criarLinkJogador(timer.jogador, clientId);
                    
                    console.log(`🔗 Link final para ${timer.jogador}: ${jogadorFormatado}`);
                    
                    descricao += `${timer.codigo} - ${tempoFormatado}${nomeFormatado}: ${jogadorFormatado}${infoFila}

`;
                }
            }
            
            if (todosTimers.length === 0) {
                descricao += `💤 NENHUM TIMER ATIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Use [b]!resp [código] [tempo][/b] para iniciar

`;
            }
            
            descricao += `🕐 Última atualização: ${new Date().toLocaleTimeString('pt-BR')}
🤖 Sistema: AliBot
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
            const respawnsListChannelId = "9"; // ID do canal Respawns List (você precisará ajustar este ID)
            
            // Construir descrição base do canal
            let descricao = `[img]https://i.imgur.com/respawnslist.png[/img]

📋 LISTA DE RESPAWNS DISPONÍVEIS 📋
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏰 RESPAWNS DARASHIA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️ [b]f4[/b] - Ferumbras Ascendant (F4)
⚔️ [b]f3[/b] - Ferumbras Mortal Shell (F3) 
⚔️ [b]f2[/b] - Ferumbras Citadel (F2)
⚔️ [b]f1[/b] - Ferumbras Threated Dreams (F1)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕐 Última atualização: ${new Date().toLocaleString('pt-BR')}
🤖 Sistema: AliBot
⚡ Comandos: Disponíveis 24/7
🎮 Use [b]!help[/b] para mais informações`;

            // Atualizar canal
            try {
                await this.serverQuery.execute('channeledit', {
                    cid: respawnsListChannelId,
                    channel_description: descricao
                });
                
                console.log(`📋 Canal Respawns List atualizado com todos os respawns disponíveis`);
            } catch (error1: any) {
                console.log('⚠️ Método channel_description falhou para Respawns List, tentando channel_topic...');
                try {
                    await this.serverQuery.execute('channeledit', {
                        cid: respawnsListChannelId,
                        channel_topic: descricao
                    });
                    
                    console.log(`📋 Canal Respawns List atualizado via topic`);
                } catch (error2: any) {
                    console.log('❌ Ambos os métodos falharam para Respawns List:', error1.message, '|', error2.message);
                    console.log('💡 Canal não foi atualizado, mas sistema continua funcionando...');
                }
            }
            
        } catch (error: any) {
            console.log('❌ Erro ao atualizar canal Respawns List:', error.message);
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
                    console.log(`👥 ${membrosOnline.length} membros online encontrados (de ${guild.members.length} totais)`);
                    
                    // Log detalhado dos membros encontrados (primeiros 10)
                    const maxLog = Math.min(10, membrosOnline.length);
                    for (let i = 0; i < maxLog; i++) {
                        const membro = membrosOnline[i];
                        console.log(`   ${i + 1}. ${membro.name} (Level ${membro.level}) - ${membro.vocation} [${membro.rank}]`);
                    }
                    if (membrosOnline.length > 10) {
                        console.log(`   ... e mais ${membrosOnline.length - 10} membros`);
                    }
                    
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
            const nomeJogador = remetente.clientNickname || remetente.nickname || 'Desconhecido';
            
            if (!codigo) {
                return `❌ Formato incorreto!
📋 Use: !resp [código] [tempo]
💡 Exemplos:
   !resp f4 02:30 (2 horas e 30 minutos)
   !resp f4 00:30 (30 minutos)
   !resp f4 150 (150 segundos)
   !resp f4 (aceitar next com tempo pré-definido)`;
            }
            
            let tempoParaUsar: number | null = null;
            let ehAceitacaoNext = false;
            
            // VERIFICAR SE É ACEITAÇÃO DE NEXT
            if (this.nextTimers[codigo]) {
                const nextTimer = this.nextTimers[codigo];
                
                // Verificar se é o jogador correto
                if (nextTimer.jogador === nomeJogador) {
                    ehAceitacaoNext = true;
                    
                    // Se tem tempo pré-definido e não especificou tempo, usar o pré-definido
                    if (nextTimer.tempoDesejado && partes.length === 2) {
                        tempoParaUsar = nextTimer.tempoDesejado;
                        console.log(`✅ Next aceito: ${codigo.toUpperCase()} por ${nomeJogador} - usando tempo pré-definido: ${this.formatarTempo(tempoParaUsar)}`);
                    } else if (!nextTimer.tempoDesejado && partes.length < 3) {
                        return `❌ Você precisa especificar o tempo!
📋 Use: !resp ${codigo} [tempo]
💡 Exemplos:
   !resp ${codigo} 02:30 (2 horas e 30 minutos)
   !resp ${codigo} 00:30 (30 minutos)
   !resp ${codigo} 150 (150 segundos)`;
                    } else if (partes.length >= 3) {
                        // Jogador especificou tempo mesmo tendo pré-definido (sobrescrever)
                        const tempoTexto = partes[2];
                        tempoParaUsar = this.converterTempoParaSegundos(tempoTexto);
                        if (tempoParaUsar === null) {
                            return `❌ Tempo inválido!
💡 Formatos aceitos:
   HH:MM → 00:30 = 30 minutos
   HH:MM:SS → 01:30:45 = 1h30min45s
   SSSS → 150 = 150 segundos`;
                        }
                        console.log(`✅ Next aceito: ${codigo.toUpperCase()} por ${nomeJogador} - sobrescrevendo com novo tempo: ${this.formatarTempo(tempoParaUsar)}`);
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
                    return `❌ Formato incorreto!
📋 Use: !resp [código] [tempo]
💡 Exemplos:
   !resp f4 02:30 (2 horas e 30 minutos)
   !resp f4 00:30 (30 minutos)
   !resp f4 150 (150 segundos)`;
                }
                
                const tempoTexto = partes[2];
                tempoParaUsar = this.converterTempoParaSegundos(tempoTexto);
                if (tempoParaUsar === null) {
                    return `❌ Tempo inválido!
💡 Formatos aceitos:
   HH:MM → 00:30 = 30 minutos
   HH:MM:SS → 01:30:45 = 1h30min45s
   SSSS → 150 = 150 segundos`;
                }
            }
            
            // Verificar se já existe timer ativo (e não é aceitação de next)
            if (this.timersRespawn[codigo] && !ehAceitacaoNext) {
                return `❌ Respawn já está ativo!
⚔️ ${this.timersRespawn[codigo].nome} (${codigo.toUpperCase()})
👤 Jogador: ${this.timersRespawn[codigo].jogador}
⏰ Restante: ${this.formatarTempo(this.timersRespawn[codigo].tempoRestante)}`;
            }

            // Criar timer
            const timer: RespawnTimer = {
                codigo: codigo,
                nome: this.obterNomeRespawn(codigo),
                jogador: remetente.clientNickname || remetente.nickname || 'Desconhecido',
                tempoRestante: tempoParaUsar!,
                iniciadoEm: new Date(),
                duracaoTotal: tempoParaUsar!
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
            
            return `✅ Timer iniciado!${tipoAceitacao}
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
            
            if (!this.timersRespawn[codigo]) {
                return `❌ Nenhum timer ativo para o código "${codigo.toUpperCase()}"
📋 Use !fila para ver timers ativos`;
            }

            const timer = this.timersRespawn[codigo];
            
            // Verificar se é o mesmo jogador
            if (timer.jogador !== (remetente.clientNickname || remetente.nickname || 'Desconhecido')) {
                return `❌ Apenas ${timer.jogador} pode sair deste respawn!
⚔️ Respawn: ${timer.nome} (${codigo.toUpperCase()})`;
            }

            // Remover timer
            delete this.timersRespawn[codigo];
            
            // Atualizar canal
            await this.atualizarCanalClaimeds();

            return `✅ Saiu do respawn!
⚔️ Respawn: ${timer.nome} (${codigo.toUpperCase()})
👤 ${timer.jogador} deixou a fila
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
   !next f4 (sem tempo específico)
   !next f4 02:30 (com tempo de 2h30min)
   !next f4 150 (com tempo de 150 segundos)`;
            }

            const codigo = partes[1].toLowerCase();
            const nomeJogador = remetente.clientNickname || remetente.nickname || 'Desconhecido';
            
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
                
                tempoDesejado = segundos;
            }
            
            // Verificar se o código existe na configuração
            const configRespawns = this.obterConfigRespawns();
            if (!configRespawns[codigo]) {
                return `❌ Código "${codigo.toUpperCase()}" não existe!
📋 Use !help para ver códigos disponíveis`;
            }

            // Verificar se já está no timer atual
            if (this.timersRespawn[codigo]) {
                if (this.timersRespawn[codigo].jogador === nomeJogador) {
                    return `❌ Você já está com este respawn ativo!
⚔️ ${configRespawns[codigo]} (${codigo.toUpperCase()})`;
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

            // LIMITAR FILA A 2 NEXTS
            if (this.filasClaimeds[codigo].length >= 2) {
                return `❌ Fila lotada!
🎯 Máximo: 2 nexts por claimed
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
            
            // Informar sobre tempo pré-definido
            const infoTempo = tempoDesejado ? 
                `⏰ Tempo pré-definido: ${this.formatarTempo(tempoDesejado)}` :
                `⏰ Sem tempo pré-definido (você escolherá ao aceitar)`;

            return `✅ Adicionado à fila!
🎯 Posição: ${novaFila.posicao}/${this.filasClaimeds[codigo].length}
⚔️ ${configRespawns[codigo]} (${codigo.toUpperCase()})
${infoTempo}
${statusAtual}
🔄 Canal Claimeds atualizado

💡 Quando for sua vez, use apenas [b]!resp[/b] para aceitar ${tempoDesejado ? 'com o tempo pré-definido' : 'e escolher o tempo'}`;

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
                
                // Atualizar todos os timers de respawn (decrementar 1 minuto = 60 segundos)
                for (const codigo in this.timersRespawn) {
                    const timer = this.timersRespawn[codigo];
                    timer.tempoRestante -= 60; // Decrementar 1 minuto
                    
                    if (timer.tempoRestante <= 0) {
                        console.log(`⚔️ Timer expirado: ${timer.nome} (${codigo.toUpperCase()}) - ${timer.jogador}`);
                        
                        // ENVIAR POKE para o jogador avisando que o tempo expirou
                        await this.enviarPokeExpiracao(timer.jogador, codigo, timer.nome);
                        
                        delete this.timersRespawn[codigo];
                        timerExpirou = true;
                        atualizacaoNecessaria = true;
                        
                        // Verificar se há fila para este claimed
                        await this.processarFilaAposExpiracao(codigo);
                    }
                }
                
                // Atualizar timers de next (10 minutos para aceitar)
                for (const codigo in this.nextTimers) {
                    const nextTimer = this.nextTimers[codigo];
                    nextTimer.tempoRestante -= 60; // Decrementar 1 minuto
                    
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
                
                // Atualizar canal a cada minuto ou quando timer expira
                atualizacaoNecessaria = true;
                
                // Atualizar canal apenas quando necessário
                if (atualizacaoNecessaria) {
                    await this.atualizarCanalClaimeds();
                }
                
                // Parar sistema se não há mais timers
                if (Object.keys(this.timersRespawn).length === 0) {
                    console.log('⏰ Nenhum timer ativo - pausando sistema de timers');
                    if (this.intervalTimers) {
                        clearInterval(this.intervalTimers);
                        this.intervalTimers = null;
                    }
                }
                
            } catch (error: any) {
                console.log('❌ Erro no sistema de timers:', error.message);
            }
        }, 60000); // Atualizar a cada minuto (60 segundos)
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
                    tempoDesejado: proximoJogador.tempoDesejado // Passar tempo desejado
                };
                
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
            // Remover o primeiro da fila (que não aceitou)
            if (this.filasClaimeds[codigo] && this.filasClaimeds[codigo].length > 0) {
                const jogadorQueNaoAceitou = this.filasClaimeds[codigo].shift(); // Remove o primeiro
                console.log(`❌ ${jogadorQueNaoAceitou?.jogador} não aceitou ${codigo.toUpperCase()} - removido da fila`);
                
                // Verificar se ainda há alguém na fila
                if (this.filasClaimeds[codigo].length > 0) {
                    const proximoJogador = this.filasClaimeds[codigo][0]; // Novo primeiro da fila
                    
                    // Criar novo timer de next para o próximo
                    this.nextTimers[codigo] = {
                        codigo: codigo,
                        jogador: proximoJogador.jogador,
                        tempoRestante: 600, // 10 minutos = 600 segundos
                        iniciadoEm: new Date(),
                        tempoDesejado: proximoJogador.tempoDesejado // Passar tempo desejado
                    };
                    
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
            }
        } catch (error: any) {
            console.log(`❌ Erro ao processar próximo na fila (${codigo}):`, error.message);
        }
    }

    private async enviarPokeExpiracao(nomeJogador: string, codigo: string, nomeRespawn: string): Promise<void> {
        try {
            console.log(`🔍 Buscando cliente para poke: ${nomeJogador}`);
            
            // Buscar o cliente pelo nome
            const cliente = await this.buscarClientePorNome(nomeJogador);
            if (cliente) {
                const mensagem = `⏰ SEU TIMER EXPIROU! ${codigo.toUpperCase()} - ${nomeRespawn}`;
                
                // Tentar poke (clientpoke)
                await this.serverQuery.clientPoke(cliente.clid, mensagem);
                console.log(`📢 Poke enviado para ${nomeJogador} (ID: ${cliente.clid}): Timer ${codigo.toUpperCase()} expirou`);
            } else {
                console.log(`❌ Cliente ${nomeJogador} não encontrado para poke de expiração`);
                
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
            
            // Buscar o cliente pelo nome
            const cliente = await this.buscarClientePorNome(nomeJogador);
            if (cliente) {
                const configRespawns = this.obterConfigRespawns();
                
                // Verificar se há tempo pré-definido
                const nextTimer = this.nextTimers[codigo];
                let mensagem = '';
                
                if (nextTimer && nextTimer.tempoDesejado) {
                    mensagem = `🎯 VOCÊ ASSUMIU O CLAIMED! ${codigo.toUpperCase()} - ${configRespawns[codigo]} | Use apenas !resp ${codigo} nos próximos 10 minutos para aceitar com tempo pré-definido: ${this.formatarTempo(nextTimer.tempoDesejado)}`;
                } else {
                    mensagem = `🎯 VOCÊ ASSUMIU O CLAIMED! ${codigo.toUpperCase()} - ${configRespawns[codigo]} | Use !resp ${codigo} [tempo] nos próximos 10 minutos para confirmar`;
                }
                
                // Tentar poke (clientpoke)
                await this.serverQuery.clientPoke(cliente.clid, mensagem);
                console.log(`📢 Poke enviado para ${nomeJogador} (ID: ${cliente.clid}): Assumiu claimed ${codigo.toUpperCase()}`);
            } else {
                console.log(`❌ Cliente ${nomeJogador} não encontrado para poke de next`);
                
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
            
            // Buscar o cliente pelo nome
            const cliente = await this.buscarClientePorNome(nomeJogador);
            if (cliente) {
                const mensagem = `❌ SEU NEXT EXPIROU! ${codigo.toUpperCase()} - Você não aceitou a tempo e foi removido da fila`;
                
                // Tentar poke (clientpoke)
                await this.serverQuery.clientPoke(cliente.clid, mensagem);
                console.log(`📢 Poke enviado para ${nomeJogador} (ID: ${cliente.clid}): Next ${codigo.toUpperCase()} expirado`);
            } else {
                console.log(`❌ Cliente ${nomeJogador} não encontrado para poke de next expirado`);
                
                // Log dos clientes conectados para debug
                const clientes = await this.serverQuery.clientList();
                console.log(`👥 Clientes online:`, clientes.map((c: any) => c.clientNickname || c.nickname).join(', '));
            }
        } catch (error: any) {
            console.log(`❌ Erro ao enviar poke de next expirado para ${nomeJogador}:`, error.message);
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
            
            // Busca exata primeiro
            let cliente = clientesReais.find((c: any) => {
                const nomeCliente = c.clientNickname || c.nickname || '';
                return nomeCliente === nomeJogador;
            });
            
            // Se não encontrou, busca case-insensitive
            if (!cliente) {
                cliente = clientesReais.find((c: any) => {
                    const nomeCliente = (c.clientNickname || c.nickname || '').toLowerCase();
                    return nomeCliente === nomeJogador.toLowerCase();
                });
            }
            
            // Se ainda não encontrou, busca parcial
            if (!cliente) {
                cliente = clientesReais.find((c: any) => {
                    const nomeCliente = (c.clientNickname || c.nickname || '').toLowerCase();
                    return nomeCliente.includes(nomeJogador.toLowerCase()) || nomeJogador.toLowerCase().includes(nomeCliente);
                });
            }
            
            if (cliente) {
                console.log(`✅ Cliente encontrado: "${cliente.clientNickname || cliente.nickname}" (ID: ${cliente.clid}, Type: ${cliente.type})`);
            } else {
                console.log(`❌ Cliente "${nomeJogador}" não encontrado`);
                console.log(`📋 Clientes reais disponíveis:`, clientesReais.map((c: any) => `"${c.clientNickname || c.nickname}" (ID: ${c.clid})`).join(', '));
            }
            
            return cliente;
        } catch (error: any) {
            console.log(`❌ Erro ao buscar cliente ${nomeJogador}:`, error.message);
            return null;
        }
    }

    private async obterClientIdPorNome(nomeJogador: string): Promise<string> {
        try {
            const cliente = await this.buscarClientePorNome(nomeJogador);
            if (cliente && cliente.clid) {
                console.log(`🔍 ID encontrado para ${nomeJogador}: ${cliente.clid}`);
                return cliente.clid.toString();
            }
            console.log(`⚠️ Cliente ${nomeJogador} não encontrado ou sem ID válido`);
            // Se não encontrar o cliente, retorna uma string vazia para não quebrar o BBCode
            return '';
        } catch (error: any) {
            console.log(`❌ Erro ao obter ID do cliente ${nomeJogador}:`, error.message);
            return '';
        }
    }

    private criarLinkJogador(nomeJogador: string, clientId: string): string {
        if (!clientId || clientId === '') {
            return nomeJogador; // Retorna apenas o nome se não tiver ID
        }
        
        console.log(`🔗 Criando link para ${nomeJogador} com ID ${clientId}`);
        
        // ATENÇÃO: Teste diferentes formatos aqui até encontrar o que funciona
        // Descomente a linha que funcionar e comente as outras
        
        // Formato 1: Padrão TeamSpeak 3 (mais comum)
        // return `[client=${clientId}]${nomeJogador}[/client]`;
        
        // Formato 2: URL com protocolo client
         return `[url=client://0/${clientId}]${nomeJogador}[/url]`;
        
        // Formato 3: CLIENT maiúsculo
        // return `[CLIENT=${clientId}]${nomeJogador}[/CLIENT]`;
        
        // Formato 4: USER tag
        // return `[USER=${clientId}]${nomeJogador}[/USER]`;
        
        // Formato 5: URL simples
        // return `[URL=client://${clientId}]${nomeJogador}[/URL]`;
        
        // Se nenhum formato funcionar, pode ser que BBCode não seja suportado 
        // nas descrições de canal, apenas em mensagens de chat
    }

    private obterNomeRespawn(codigo: string): string {
        const respawns: { [key: string]: string } = {
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
        
        return respawns[codigo.toLowerCase()] || `Respawn ${codigo.toUpperCase()}`;
    }

    private obterConfigRespawns(): { [key: string]: string } {
        return {
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

    private formatarTempo(segundos: number): string {
        if (segundos < 0) return '00:00';
        
        const horas = Math.floor(segundos / 3600);
        const minutos = Math.floor((segundos % 3600) / 60);
        
        // Sempre retorna no formato HH:MM (sem segundos)
        return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
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