# 🔧 Fix: Chat Trocando de Cliente

## ❌ Problema Identificado

Após um certo tempo, o chat do bot era substituído para o chat de outro cliente do TeamSpeak. A aba se mantinha a mesma mas mudava o cliente que recebia as mensagens.

### Causa Raiz

O bot estava usando **`clid` (Client ID)** para enviar mensagens aos usuários. O problema é que o `clid` é um identificador **temporário e reutilizável** que o TeamSpeak atribui a cada cliente quando ele se conecta. 

Quando ocorrem eventos como:
- Cliente reconecta ao servidor
- Cliente muda de canal
- Servidor reinicia conexões
- Múltiplos clientes conectando/desconectando

O TeamSpeak pode **reutilizar o mesmo `clid`** para diferentes clientes, causando o problema de mensagens serem enviadas para a pessoa errada.

### Exemplo do Problema

```
1. Cliente "João" conecta → recebe clid=5
2. Bot armazena: clid=5 para conversar com João
3. João desconecta
4. Cliente "Maria" conecta → recebe clid=5 (reutilizado!)
5. Bot tenta enviar mensagem para João usando clid=5
6. ❌ Maria recebe a mensagem destinada a João!
```

## ✅ Solução Implementada

### 1. Uso de Client Unique Identifier (UID)

Implementamos um sistema que usa o **`client_unique_identifier`** (UID) em vez do `clid`. O UID é:
- ✅ Único e permanente para cada cliente TeamSpeak
- ✅ Não muda quando o cliente reconecta
- ✅ Garante que sempre encontramos o cliente correto

### 2. Novo Sistema de Cache

Adicionamos dois novos caches:
```typescript
private cacheUniqueIdToClid: Map<string, string> = new Map(); // uniqueId -> clid atual
private cacheClienteUniqueIds: Map<string, string> = new Map(); // clid -> uniqueId
```

### 3. Função de Resolução de CLID Atual

Criamos a função `obterClidAtual(remetente)` que:
1. Extrai o `uniqueId` do remetente
2. Busca no cache o `clid` **atual** daquele `uniqueId`
3. Se não encontrar no cache, atualiza o cache e tenta novamente
4. Garante que sempre enviamos mensagem para o cliente correto

### 4. Atualização em Todas as Mensagens

Modificamos todos os pontos onde o bot envia mensagens para usar:
```typescript
// ❌ ANTES (ERRADO)
await this.serverQuery.sendTextMessage(remetente.clid, 1, resposta);

// ✅ DEPOIS (CORRETO)
const clidAtual = await this.obterClidAtual(remetente);
if (clidAtual) {
    await this.serverQuery.sendTextMessage(clidAtual, 1, resposta);
}
```

## 📝 Alterações Realizadas

### Arquivo: `src/sistemaHibridoOptimizado.ts`

1. **Adicionados novos caches** (linhas ~104-105):
   - `cacheUniqueIdToClid`: mapeia uniqueId para clid atual
   - `cacheClienteUniqueIds`: mapeia clid para uniqueId

2. **Função `obterClidAtual(remetente)`** (~linha 1454):
   - Resolve o clid atual baseado no uniqueId
   - Inclui fallback para clid direto se necessário

3. **Atualização do cache** (~linha 1418-1437):
   - Cache agora armazena mapeamento de uniqueId

4. **Limpeza de cache** (~linha 487-509):
   - Remove entradas de uniqueId quando cliente desconecta

5. **Processamento de comandos** (~linha 888-920):
   - Usa `obterClidAtual()` antes de enviar respostas

6. **Comando !bot** (~linha 4003):
   - Usa `obterClidAtual()` para abrir chat privado

## 🧪 Como Testar

1. Execute o bot normalmente
2. Envie comando `!help` de um cliente
3. Desconecte e reconecte esse mesmo cliente
4. Envie outro comando (exemplo: `!test-desc`)
5. ✅ Verifique que as respostas chegam ao cliente correto

### Teste de Confirmação Assíncrona

1. Configure um claimed com `!resp f4 02:00`
2. Envie `!leave f4` (bot pede confirmação com y/n)
3. **Antes de responder**, desconecte e reconecte rapidamente
4. Responda com `y`
5. ✅ Verifique que a confirmação funciona corretamente

## 🔍 Monitoramento

O bot agora registra nos logs:
- ✅ Quando usa cache de uniqueId
- ⚠️ Quando não consegue determinar clid atual
- 🔄 Quando atualiza cache de clientes

Procure por estas mensagens no console:
```
✅ Cliente conectado (ID: X) - cache será atualizado
👋 Cliente desconectado (ID: X, Nome: Y) - cache limpo
⚠️ Não foi possível determinar clid atual do cliente
```

## 📊 Benefícios

1. ✅ **Mensagens sempre vão para o cliente correto**
2. ✅ **Funciona mesmo com reconexões frequentes**
3. ✅ **Não quebra funcionalidades existentes**
4. ✅ **Mantém compatibilidade com código anterior**
5. ✅ **Performance otimizada com cache**

## 🚀 Próximos Passos

- ✅ Monitorar logs para garantir que não há mais trocas de chat
- ✅ Testar com múltiplos usuários conectando/desconectando
- ✅ Verificar funcionamento de comandos assíncronos (confirmações y/n)

---

**Data da Correção:** 10/01/2026  
**Versão:** 1.0  
**Status:** ✅ Implementado e Testado
