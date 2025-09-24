# CorpBot - Bot de Registro e Bate-Ponto para Discord

## Descrição

CorpBot é um bot para Discord desenvolvido para gerenciar registros de membros e controlar o sistema de bate-ponto em chamadas de voz. Ele utiliza Google Sheets para armazenar informações de usuários, incluindo horas de presença em calls, e envia mensagens formatadas com embeds e botões interativos.

## Funcionalidades

### Registro de Usuários

* Formulário interativo com Modal.
* Atualiza nickname do usuário automaticamente.
* Envia um embed com informações do usuário para um canal específico.
* Registra usuário em uma planilha do Google Sheets.

### Bate-Ponto (Voice State)

* Monitora entradas e saídas em uma categoria de voz específica.
* Calcula horas e minutos de presença.
* Atualiza horas acumuladas na planilha.
* Envia embed de início e término do bate-ponto.

## Estrutura do Projeto

```
corpbot/
├─ commands/
│  ├─ registro.js
│  └─ batePonto.js
├─ utils/
│  ├─ sheets.js
│  └─ format.js
├─ .env
├─ index.js
├─ package.json
└─ README.md
```

## Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
TOKEN=SEU_TOKEN_DO_DISCORD
SPREADSHEET_ID=ID_DA_PLANILHA
GOOGLE_CREDENTIALS_PATH=credentials.json
GUILD_ID=ID_DO_SERVIDOR
TIMEZONE=America/Sao_Paulo
```

### 2. Credenciais do Google

* Crie uma conta de serviço no Google Cloud.
* Gere um arquivo JSON de credenciais.
* Defina a variável `GOOGLE_CREDENTIALS_PATH` apontando para este arquivo.

### 3. Dependências

Instale as dependências:

```
npm install discord.js luxon googleapis dotenv
```

### 4. Rodar o Bot

```
npm start
```

## Uso

### Registro

* Canal do painel: `1396852912709308426`
* Canal de informações de registro: `1390033258821062760`
* Clique no botão para abrir o formulário.
* Preencha os campos: Nickname, ID do jogo, Login.
* O bot atualiza o nickname e envia o embed para o canal de informações.

### Bate-Ponto

* Categoria de voz monitorada: `1390033257910894599`
* Canal de logs: `1390161145037590549`
* Entrando na categoria inicia o ponto.
* Saindo da categoria finaliza o ponto e calcula horas e minutos.

## Estrutura dos Arquivos Principais

### index.js

* Inicializa o bot e define intents.
* Eventos: `ready`, `interactionCreate`, `voiceStateUpdate`.

### commands/registro.js

* Cria o Modal e os botões.
* Gera embed para canal de informações.
* Registra usuário no Sheets.

### commands/batePonto.js

* Monitora entrada e saída de calls.
* Calcula duração da presença.
* Atualiza planilha.
* Envia embeds de início e término.

### utils/sheets.js

* Conecta com Google Sheets usando credenciais da conta de serviço.
* Funções: `registrarUsuario`, `atualizarHorasUsuario`.

### utils/format.js

* Funções auxiliares para formatação de tempo e timestamp em Brasil.
* `formatTimeBR(date)` - retorna `HH:mm`
* `formatTimestampBR(date)` - retorna timestamp para embed `<t:TIMESTAMP:t>`

## Customização

* Alterar ícones nos embeds: substitua `ICON_EMOJI` nas variáveis.
* Alterar cores de embeds: mudar valores hexadecimais em `.setColor()`.
* Alterar canais: substitua `PANEL_CHANNEL_ID`, `USER_INFO_CHANNEL_ID` e `LOG_CHANNEL_ID`.

## Licença

Yuji Ohashi & Benash
