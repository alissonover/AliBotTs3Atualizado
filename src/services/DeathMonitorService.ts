import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface para dados de morte de um personagem
 */
export interface PlayerDeath {
    character: {
        name: string;
        level: number;
        vocation: string;
    };
    time: string;
    reason: string;
}

/**
 * Interface para dados de cache de mortes
 */
interface DeathCacheData {
    character: string;
    lastChecked: string; // ISO timestamp
    recentDeaths: PlayerDeath[];
}

/**
 * Interface para cache de players online
 */
interface OnlinePlayersCache {
    players: Set<string>;
    lastUpdate: number;
}

/**
 * Opções de configuração do serviço de monitoramento de mortes
 */
export interface DeathMonitorOptions {
    /** Tempo limite em minutos para considerar uma morte como recente */
    recentDeathLimitMinutes?: number;
    /** Intervalo de atualização do cache de players online em ms */
    onlineCacheUpdateInterval?: number;
    /** Timeout para requisições à API em ms */
    apiTimeout?: number;
    /** Número máximo de tentativas em caso de erro */
    maxRetries?: number;
    /** Tamanho do lote para processamento paralelo */
    batchSize?: number;
    /** Delay entre lotes em ms */
    delayBetweenBatches?: number;
    /** Nome do mundo do Tibia a monitorar */
    worldName?: string;
}

/**
 * Serviço otimizado para monitoramento de mortes de personagens do Tibia
 * 
 * Características:
 * - Cache inteligente de mortes por personagem
 * - Filtro de players online para evitar requisições desnecessárias
 * - Rate limiting e controle de requisições à API
 * - Retry automático em caso de falhas de conexão
 * - Processamento em lotes paralelos com controle
 */
export class DeathMonitorService {
    private deathCache: Map<string, DeathCacheData> = new Map();
    private onlineCache: OnlinePlayersCache = {
        players: new Set(),
        lastUpdate: 0
    };
    private axiosInstance: AxiosInstance;
    private readonly options: Required<DeathMonitorOptions>;
    private readonly cacheFilePath: string;
    
    // Controle de rate limiting
    private requestQueue: Array<() => Promise<void>> = [];
    private activeRequests: number = 0;
    private readonly maxConcurrentRequests: number = 3;

    constructor(options: DeathMonitorOptions = {}) {
        this.options = {
            recentDeathLimitMinutes: options.recentDeathLimitMinutes ?? 20,
            onlineCacheUpdateInterval: options.onlineCacheUpdateInterval ?? 120000, // 2 minutos
            apiTimeout: options.apiTimeout ?? 25000, // 25 segundos
            maxRetries: options.maxRetries ?? 3,
            batchSize: options.batchSize ?? 3,
            delayBetweenBatches: options.delayBetweenBatches ?? 2000,
            worldName: options.worldName ?? 'Kalibra'
        };

        this.cacheFilePath = path.join(process.cwd(), 'mortes-cache.json');
        
        // Configurar axios com defaults otimizados
        this.axiosInstance = axios.create({
            timeout: this.options.apiTimeout,
            headers: {
                'User-Agent': 'AliBotTS3-DeathMonitor/2.0',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive'
            },
            maxRedirects: 5,
            validateStatus: (status) => status < 500
        });

        this.loadDeathCache();
    }

    /**
     * Carrega o cache de mortes do arquivo JSON
     */
    private loadDeathCache(): void {
        try {
            if (fs.existsSync(this.cacheFilePath)) {
                const data = fs.readFileSync(this.cacheFilePath, 'utf8');
                const parsed = JSON.parse(data);
                
                // Migrar dados se necessário (formato antigo para novo)
                if (parsed.mortes) {
                    console.log('🔄 Migrando formato antigo de cache de mortes...');
                    this.migrateOldCacheFormat(parsed);
                } else {
                    // Formato já está correto
                    this.deathCache = new Map(Object.entries(parsed));
                }
                
                console.log(`💀 ✅ Cache de mortes carregado: ${this.deathCache.size} personagens`);
            } else {
                console.log('💀 📝 Criando novo arquivo de cache de mortes...');
                this.saveDeathCache();
            }
        } catch (error: any) {
            console.log('❌ Erro ao carregar cache de mortes:', error.message);
            this.deathCache = new Map();
        }
    }

    /**
     * Migra formato antigo do cache para o novo
     */
    private migrateOldCacheFormat(oldData: any): void {
        const mortes = oldData.mortes || {};
        
        for (const [character, deaths] of Object.entries(mortes)) {
            this.deathCache.set(character, {
                character: character,
                lastChecked: new Date().toISOString(),
                recentDeaths: Array.isArray(deaths) ? deaths : []
            });
        }
        
        this.saveDeathCache();
        console.log('✅ Migração de cache concluída');
    }

    /**
     * Salva o cache de mortes no arquivo JSON
     */
    private saveDeathCache(): void {
        try {
            const cacheObject = Object.fromEntries(this.deathCache);
            fs.writeFileSync(this.cacheFilePath, JSON.stringify(cacheObject, null, 2));
        } catch (error: any) {
            console.log('❌ Erro ao salvar cache de mortes:', error.message);
        }
    }

    /**
     * Atualiza o cache de players online do mundo
     */
    public async updateOnlineCache(attempt: number = 1): Promise<void> {
        const maxAttempts = 3;
        
        try {
            const timestamp = new Date().toLocaleTimeString();
            if (attempt === 1) {
                console.log(`🌍 [${timestamp}] Atualizando cache de players online...`);
            }
            
            const response = await this.axiosInstance.get(
                `https://api.tibiadata.com/v4/world/${encodeURIComponent(this.options.worldName)}`
            );

            if (response.data?.world?.online_players && Array.isArray(response.data.world.online_players)) {
                const playersOnline = response.data.world.online_players;
                
                // Atualizar cache
                this.onlineCache.players.clear();
                playersOnline.forEach((player: any) => {
                    if (player.name) {
                        this.onlineCache.players.add(player.name.toLowerCase());
                    }
                });
                
                this.onlineCache.lastUpdate = Date.now();
                console.log(`✅ Cache atualizado: ${this.onlineCache.players.size} players online no ${this.options.worldName}`);
            } else {
                console.log('⚠️ Resposta da API não contém players online');
            }
        } catch (error: any) {
            const statusCode = error.response?.status;
            const errorCode = error.code;
            
            // Retry em erros temporários (503, timeout, conexão)
            if ((statusCode === 503 || errorCode === 'ETIMEDOUT' || errorCode === 'ECONNRESET') && attempt < maxAttempts) {
                const delayMs = 5000 * attempt; // 5s, 10s, 15s
                console.log(`⚠️ Erro HTTP ${statusCode || errorCode}: Retry ${attempt}/${maxAttempts} em ${delayMs}ms...`);
                await this.delay(delayMs);
                return this.updateOnlineCache(attempt + 1);
            }
            
            // Log erro final ou manter cache anterior
            const cacheAge = this.onlineCache.lastUpdate > 0 
                ? Math.round((Date.now() - this.onlineCache.lastUpdate) / 60000) 
                : 'nunca';
            
            console.log(`❌ Erro ao atualizar cache de players online: ${error.message}`);
            console.log(`💾 Mantendo cache anterior (${this.onlineCache.players.size} players, atualizado há ${cacheAge} min)`);
        }
    }

    /**
     * Verifica se o cache de players online precisa ser atualizado
     */
    private shouldUpdateOnlineCache(): boolean {
        const timeSinceUpdate = Date.now() - this.onlineCache.lastUpdate;
        return timeSinceUpdate > this.options.onlineCacheUpdateInterval;
    }

    /**
     * Verifica se um personagem está online (usando cache)
     */
    public isPlayerOnline(characterName: string): boolean {
        return this.onlineCache.players.has(characterName.toLowerCase());
    }

    /**
     * Monitora mortes de uma lista de personagens
     * @param characters Lista de nomes de personagens para monitorar
     * @returns Array de novas mortes detectadas
     */
    public async checkDeaths(characters: string[]): Promise<Map<string, PlayerDeath[]>> {
        try {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`💀 [${timestamp}] Verificando mortes de ${characters.length} personagens...`);

            // Atualizar cache de online se necessário
            if (this.shouldUpdateOnlineCache()) {
                await this.updateOnlineCache();
            }

            // DEBUG: Mostrar estado do cache
            const cacheSize = this.onlineCache.players.size;
            const cacheAge = this.onlineCache.lastUpdate > 0 
                ? Math.round((Date.now() - this.onlineCache.lastUpdate) / 60000)
                : 'nunca';
            console.log(`🔍 Cache: ${cacheSize} players online, atualizado há ${cacheAge} min`);

            // Se cache está vazio ou muito antigo (>10 min), verificar TODOS os personagens
            const cacheIsStale = this.onlineCache.lastUpdate === 0 || 
                                (Date.now() - this.onlineCache.lastUpdate) > 600000; // 10 minutos
            
            let charactersToCheck: string[];
            
            if (cacheIsStale || cacheSize === 0) {
                console.log(`⚠️ Cache indisponível/antigo - verificando TODOS os ${characters.length} personagens`);
                charactersToCheck = characters;
            } else {
                // Filtrar apenas personagens online
                charactersToCheck = characters.filter(char => this.isPlayerOnline(char));
            }
            
            if (charactersToCheck.length === 0) {
                console.log(`💀 Nenhum personagem para verificar (0 de ${characters.length})`);
                return new Map();
            }

            if (cacheIsStale || cacheSize === 0) {
                console.log(`📊 Verificando todos ${charactersToCheck.length} personagens (cache indisponível)`);
            } else {
                console.log(`📊 Verificando ${charactersToCheck.length} de ${characters.length} personagens (apenas online)`);
            }

            // Processar em lotes
            const newDeaths = new Map<string, PlayerDeath[]>();
            let successCount = 0;
            let failureCount = 0;

            for (let i = 0; i < charactersToCheck.length; i += this.options.batchSize) {
                const batch = charactersToCheck.slice(i, i + this.options.batchSize);
                
                // Processar lote em paralelo
                const results = await Promise.allSettled(
                    batch.map(char => this.checkCharacterDeaths(char))
                );

                // Processar resultados
                results.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        const deaths = result.value;
                        if (deaths.length > 0) {
                            newDeaths.set(batch[index], deaths);
                        }
                        successCount++;
                    } else {
                        failureCount++;
                    }
                });

                // Delay entre lotes (exceto no último)
                if (i + this.options.batchSize < charactersToCheck.length) {
                    await this.delay(this.options.delayBetweenBatches);
                }
            }

            console.log(`📊 Resultado: ${successCount} sucessos, ${failureCount} falhas de ${charactersToCheck.length} personagens`);
            
            const totalNewDeaths = Array.from(newDeaths.values()).reduce((sum, deaths) => sum + deaths.length, 0);
            if (totalNewDeaths > 0) {
                console.log(`💀 [${timestamp}] ${totalNewDeaths} nova(s) morte(s) encontrada(s)`);
            } else {
                console.log(`💀 [${timestamp}] Nenhuma nova morte encontrada`);
            }

            // Salvar cache uma única vez no final
            this.saveDeathCache();

            return newDeaths;

        } catch (error: any) {
            console.log('❌ Erro geral no monitoramento de mortes:', error.message);
            return new Map();
        }
    }

    /**
     * Verifica mortes de um personagem específico
     * @param characterName Nome do personagem
     * @returns Array de novas mortes detectadas
     */
    private async checkCharacterDeaths(characterName: string): Promise<PlayerDeath[]> {
        let attempt = 1;

        while (attempt <= this.options.maxRetries) {
            try {
                const response = await this.axiosInstance.get(
                    `https://api.tibiadata.com/v4/character/${encodeURIComponent(characterName)}`
                );

                if (!response.data?.character) {
                    return [];
                }

                const deaths = response.data.character.deaths || [];
                if (deaths.length === 0) {
                    // NÃO atualizar cache se não há mortes - evita marcar como "verificado"
                    // quando na verdade pode haver mortes que ainda não apareceram na API
                    console.log(`⏭️ ${characterName}: Sem mortes registradas (cache mantido)`);
                    return [];
                }

                return this.processCharacterDeaths(characterName, deaths, response.data.character.character);

            } catch (error: any) {
                const errorCode = error.code;

                // Retry em erros de conexão
                if ((errorCode === 'ECONNRESET' || errorCode === 'ETIMEDOUT' || errorCode === 'ECONNABORTED') 
                    && attempt < this.options.maxRetries) {
                    const delayMs = 3000 * attempt;
                    console.log(`⚠️ ${characterName}: ${errorCode}, retry ${attempt}/${this.options.maxRetries} em ${delayMs}ms`);
                    await this.delay(delayMs);
                    attempt++;
                    continue;
                }

                // Erro 404 ou personagem não encontrado
                if (error.response?.status === 404) {
                    this.updateCharacterCache(characterName, []);
                }

                // Log erro final
                if (attempt >= this.options.maxRetries) {
                    console.log(`❌ ${characterName}: Falha após ${this.options.maxRetries} tentativas (${errorCode})`);
                }

                return [];
            }
        }

        return [];
    }

    /**
     * Processa mortes de um personagem e identifica novas
     */
    private processCharacterDeaths(characterName: string, deaths: any[], characterInfo: any): PlayerDeath[] {
        const cachedData = this.deathCache.get(characterName) || {
            character: characterName,
            lastChecked: new Date(0).toISOString(),
            recentDeaths: []
        };

        const lastCheck = new Date(cachedData.lastChecked);
        const now = new Date();
        const recentDeathLimit = this.options.recentDeathLimitMinutes * 60 * 1000;
        const newDeaths: PlayerDeath[] = [];

        // DEBUG: Log do estado atual
        console.log(`🔍 ${characterName}: lastCheck=${lastCheck.toISOString()}`);

        // Verificar primeira morte (mais recente) - otimização
        const firstDeath = deaths[0];
        const firstDeathDate = this.parseDeathTime(firstDeath.time);

        console.log(`🔍 ${characterName}: Morte mais recente=${firstDeath.time} (parsed: ${firstDeathDate.toISOString()})`);

        // Se a morte mais recente já foi processada, pular (SEM atualizar cache)
        if (firstDeathDate <= lastCheck) {
            console.log(`⏭️ ${characterName}: Morte já processada, pulando (sem atualizar cache)`);
            return [];
        }

        // Processar todas as mortes novas
        for (const death of deaths) {
            const deathTime = this.parseDeathTime(death.time);
            const timeSinceDeath = now.getTime() - deathTime.getTime();
            const minutesSinceDeath = Math.round(timeSinceDeath / 60000);

            console.log(`🔍 ${characterName}: Verificando morte de ${death.time} - ${minutesSinceDeath} min atrás`);

            if (deathTime > lastCheck && timeSinceDeath <= recentDeathLimit) {
                console.log(`💀 ✅ ${characterInfo.name} - ${minutesSinceDeath} min atrás - NOVA MORTE!`);

                newDeaths.push({
                    character: {
                        name: characterInfo.name,
                        level: characterInfo.level,
                        vocation: characterInfo.vocation
                    },
                    time: death.time,
                    reason: death.reason || 'Causa desconhecida'
                });
            } else if (deathTime <= lastCheck) {
                console.log(`⏭️ Morte antiga (já processada)`);
            } else {
                console.log(`⏰ Morte muito antiga (>${this.options.recentDeathLimitMinutes} min)`);
            }
        }

        // IMPORTANTE: Atualizar cache APENAS se encontrou mortes novas
        if (newDeaths.length > 0) {
            console.log(`💾 ${characterName}: Atualizando cache com ${newDeaths.length} nova(s) morte(s)`);
            this.updateCharacterCache(characterName, deaths.slice(0, 5));
        } else {
            console.log(`⏭️ ${characterName}: Sem mortes novas, cache mantido`);
        }

        return newDeaths;
    }

    /**
     * Atualiza o cache de um personagem
     */
    private updateCharacterCache(characterName: string, recentDeaths: any[]): void {
        this.deathCache.set(characterName, {
            character: characterName,
            lastChecked: new Date().toISOString(),
            recentDeaths: recentDeaths
        });
    }

    /**
     * Faz parse de uma string de tempo de morte para Date
     */
    private parseDeathTime(timeString: string): Date {
        try {
            // Remover timezone para parsing mais confiável
            let cleanTime = timeString.replace(/ CET$/, '').replace(/ CEST$/, '');

            // Tentar parsing direto
            let deathDate = new Date(cleanTime);

            // Se não funcionou, tentar formato alternativo
            if (isNaN(deathDate.getTime())) {
                cleanTime = cleanTime.replace(/(\w{3} \d{1,2}) (\d{4}),/, '$1, $2');
                deathDate = new Date(cleanTime);
            }

            // Validar se a data faz sentido
            const now = new Date();
            const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            const oneHourAhead = new Date(now.getTime() + 60 * 60 * 1000);

            if (isNaN(deathDate.getTime()) || deathDate < oneYearAgo || deathDate > oneHourAhead) {
                return new Date(0);
            }

            return deathDate;

        } catch (error: any) {
            console.log(`❌ Erro ao parsear tempo de morte "${timeString}":`, error.message);
            return new Date(0);
        }
    }

    /**
     * Delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Limpa o cache de mortes
     */
    public clearCache(): void {
        this.deathCache.clear();
        this.saveDeathCache();
        console.log('💀 Cache de mortes limpo');
    }

    /**
     * Obtém estatísticas do serviço
     */
    public getStats(): {
        cachedCharacters: number;
        onlinePlayers: number;
        lastOnlineUpdate: Date;
    } {
        return {
            cachedCharacters: this.deathCache.size,
            onlinePlayers: this.onlineCache.players.size,
            lastOnlineUpdate: new Date(this.onlineCache.lastUpdate)
        };
    }
}
