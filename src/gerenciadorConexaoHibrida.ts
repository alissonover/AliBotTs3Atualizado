import { TeamSpeak, QueryProtocol } from "ts3-nodejs-library";
import * as fs from 'fs';
import * as path from 'path';

interface ConexaoConfig {
    host: string;
    queryport: number;
    serverport: number;
    username: string;
    password: string;
}

class GerenciadorConexaoHibrida {
    private static instancia: GerenciadorConexaoHibrida;
    private conexaoAtiva: TeamSpeak | null = null;
    private config: ConexaoConfig;
    private tentativasReconexao = 0;
    private maxTentativas = 3;

    private constructor() {
        // Carregar configuração
        const configPath = path.join(__dirname, '..', 'config.json');
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.config = {
            host: configData.teamspeak.host,
            queryport: configData.teamspeak.queryport,
            serverport: configData.teamspeak.serverport,
            username: configData.teamspeak.username,
            password: configData.teamspeak.password
        };
    }

    public static obterInstancia(): GerenciadorConexaoHibrida {
        if (!GerenciadorConexaoHibrida.instancia) {
            GerenciadorConexaoHibrida.instancia = new GerenciadorConexaoHibrida();
        }
        return GerenciadorConexaoHibrida.instancia;
    }

    public async obterConexaoUnica(): Promise<TeamSpeak | null> {
        if (this.conexaoAtiva) {
            console.log('🔗 Usando conexão ServerQuery existente');
            return this.conexaoAtiva;
        }

        return this.criarNovaConexao();
    }

    private async criarNovaConexao(): Promise<TeamSpeak | null> {
        try {
            console.log('🚀 Criando nova conexão ServerQuery única...');
            
            // Fechar conexão anterior se existir
            if (this.conexaoAtiva) {
                try {
                    await this.conexaoAtiva.quit();
                } catch (error) {
                    console.log('⚠️ Erro ao fechar conexão anterior:', error);
                }
            }

            // Aguardar mais tempo antes de nova conexão para evitar "too many sessions"
            console.log('⏳ Aguardando limpeza de sessões anteriores...');
            await new Promise(resolve => setTimeout(resolve, 8000)); // 8 segundos

            // Tentar com nickname único baseado em timestamp
            const timestampUnico = Date.now();
            const nicknameUnico = `AliBot-${timestampUnico}`;
            
            console.log(`🔗 Conectando com nickname único: ${nicknameUnico}`);

            this.conexaoAtiva = await TeamSpeak.connect({
                host: this.config.host,
                queryport: this.config.queryport,
                protocol: QueryProtocol.RAW,
                username: this.config.username,
                password: this.config.password,
                nickname: nicknameUnico,
                serverport: this.config.serverport
            });

            console.log('✅ ServerQuery conectado com sucesso!');
            this.tentativasReconexao = 0;

            // Configurar eventos de desconexão
            this.conexaoAtiva.on("close", () => {
                console.log('❌ Conexão ServerQuery perdida');
                this.conexaoAtiva = null;
            });

            this.conexaoAtiva.on("error", (error) => {
                console.log('❌ Erro na conexão ServerQuery:', error.message);
            });

            return this.conexaoAtiva;

        } catch (error: any) {
            console.log('❌ Erro ao conectar ServerQuery:', error.message);
            
            // Se for erro de "too many sessions", aguardar mais tempo
            if (error.message && error.message.includes('too many')) {
                console.log('⚠️ Muitas sessões ativas, aguardando mais tempo...');
                await new Promise(resolve => setTimeout(resolve, 15000)); // 15 segundos
            }
            
            if (this.tentativasReconexao < this.maxTentativas) {
                this.tentativasReconexao++;
                console.log(`🔄 Tentativa ${this.tentativasReconexao}/${this.maxTentativas} em 10 segundos...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
                return this.criarNovaConexao();
            }

            return null;
        }
    }

    public async resetCompleto(): Promise<void> {
        console.log('🔄 Iniciando reset completo do gerenciador...');
        
        if (this.conexaoAtiva) {
            try {
                await this.conexaoAtiva.quit();
                console.log('✅ Conexão anterior fechada');
            } catch (error) {
                console.log('⚠️ Erro ao fechar conexão:', error);
            }
        }

        this.conexaoAtiva = null;
        this.tentativasReconexao = 0;
        
        // Aguardar mais tempo para garantir limpeza completa
        console.log('⏳ Aguardando limpeza completa das sessões...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 segundos
        console.log('✅ Reset completo finalizado');
    }

    public estaConectado(): boolean {
        return this.conexaoAtiva !== null;
    }

    public obterConexaoAtual(): TeamSpeak | null {
        return this.conexaoAtiva;
    }
}

export default GerenciadorConexaoHibrida;