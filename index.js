// index.js - Bot WhatsApp Botocenter Patos (detecção automática de atendente)
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

// ====== SERVIDOR BÁSICO ======
const app = express();
const PORT = 3002;

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Bot Botocenter Patos rodando com fluxo completo!'
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor rodando em http://localhost:${PORT}`);
});

// ====== CONFIG DO WHATSAPP ======
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox']
  }
});

// ====== ESTADO EM MEMÓRIA ======
const userState = {};

// ====== FUNÇÃO DE ATRASO ======
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ====== FUNÇÃO "DIGITANDO..." ======
async function enviarComDigitando(message, texto, tempoDigitando = 3000) {
  const chat = await message.getChat();
  await client.sendSeen(message.from);
  await chat.sendStateTyping();
  await delay(tempoDigitando);
  await message.reply(texto);
}

// ====== TEXTOS PADRÃO ======
const menuPrincipal =
  `Olá! 😊 Bem-vindo(a) à *Botocenter Patos*!\n\n` +
  `Sou a assistente virtual e vou te ajudar rapidinho!\n\n` +
  `Escolha uma opção:\n\n` +
  `📅 *1* - Agendar avaliação\n` +
  `💎 *2* - Ver procedimentos\n` +
  `👤 *3* - Falar com atendente\n` +
  `📍 *4* - Localização\n` +
  `❓ *5* - Dúvidas\n\n` +
  `*Digite apenas o número da opção* 👇`;

const procedimentosTexto =
  `💎 *NOSSOS PROCEDIMENTOS*\n\n` +
  `*BOTOX (DYSPORT)* 💉\n` +
  `* Suaviza rugas e linhas de expressão\n` +
  `* Duração média: até 4 meses\n` +
  `* De R$ 718,80 por apenas 549,00 (*10x 54,90 sem juros*)\n\n` +
  `*PREENCHIMENTOS (COM ÁCIDO HIALORÔNICO)* ✨\n` +
  `* Volume e contorno facial\n` +
  `* Duração média: 12 a 18 meses\n` +
  `* De 799,00 por apenas 599,00 (*10x 59,90 sem juros*)\n\n` +
  `*BIOESTIMULADOR DE COLÁGENO (SCULPTRA)* 😍\n` +
  `* Biostimula colágeno por até 24 meses\n` +
  `* De 2.158,80 por apenas 1.599,00 (*10x 159,00 sem juros*)\n\n` +
  `* Se quiser agendar, consigo uma *AVALIAÇÃO GRATUITA* especialmente para você! digite *1*.\n` +
  `* Para voltar ao menu, digite *0*.`;

const duvidasMenu =
  `❓ *DÚVIDAS FREQUENTES*\n\n` +
  `Digite o número da sua dúvida:\n\n` +
  `*1* - Quanto tempo dura o procedimento?\n` +
  `*2* - Precisa de anestesia?\n` +
  `*3* - Tempo de recuperação?\n` +
  `*4* - Formas de pagamento?\n` +
  `*5* - Localização da clínica?\n` +
  `*0* - Voltar ao menu`;

const duvidasRespostas = {
  '1':
    `⏱️ *DURAÇÃO DOS PROCEDIMENTOS*\n\n` +
    `• Botox: 15 a 30 minutos de aplicação\n` +
    `• Preenchimento: 30 a 45 minutos\n` +
    `• Bioestimulador de colágeno: 30 a 45 minutos\n` +
    `Os resultados podem durar de 4 meses a 2 anos, dependendo do procedimento.`,
  '2':
    `💉 *ANESTESIA*\n\n` +
    `Usamos anestésico tópico (creme) ou anestésico local de acordo com o procedimento.\n` +
    `Tudo para garantir o máximo conforto e mínima dor. 😊`,
  '3':
    `🏥 *RECUPERAÇÃO*\n\n` +
    `• Botox: vida normal logo após, pode haver leve vermelhidão.\n` +
    `• Preenchimento: leve inchaço por 24–48h.\n` +
    `• Bioestimulador de colágeno: pode haver inchaço até 7 dias.`,
  '4':
    `💳 *FORMAS DE PAGAMENTO*\n\n` +
    `Aceitamos:\n` +
    `• Dinheiro\n` +
    `• Cartão de débito/crédito\n` +
    `• Pix\n` +
    `• Parcelamento em até 10x sem juros`,
  '5':
    `📍 *LOCALIZAÇÃO DA CLÍNICA*\n\n` +
    `PATOS SHOPPING - Próximo da UNIFIP\n` +
    `* Em frente ao sorvete da Burguer King\n` +
    `* Patos - PB\n\n` +
    `🚗 Estacionamento no local, climatização e horários flexíveis`
};

// ====== EVENTOS ======
client.on('qr', (qr) => {
  console.log('📱 ESCANEIE O QR CODE ABAIXO COM SEU WHATSAPP BUSINESS:');
  console.log('');
  qrcode.generate(qr, { small: true });
  console.log('');
  console.log('👆 WhatsApp Business → Menu → Dispositivos conectados → Conectar dispositivo');
});

client.on('ready', () => {
  console.log('✅ WhatsApp conectado com sucesso!');
  console.log('🤖 Botocenter Patos - Bot online com detecção automática!');
});

client.on('message', async (message) => {
  const from = message.from;
  const body = (message.body || '').trim();

  // Ignora grupos
  if (from.includes('@g.us')) return;

  console.log(`📩 Mensagem de ${from}: "${body}"`);

  // Garante estado inicial
  if (!userState[from]) {
    userState[from] = {
      etapa: 'menu',
      dados: {},
      atendenteAtivo: false,
      ultimaInteracao: Date.now(),
      contadorMensagens: 0
    };
  }

  const estado = userState[from];

  // Controle de nova sessão após 30 min
  const agora = Date.now();
  const trintaMin = 30 * 60 * 1000;

  if (estado.ultimaInteracao && (agora - estado.ultimaInteracao > trintaMin)) {
    console.log(`🔄 Nova sessão para ${from}, resetando estado`);
    estado.etapa = 'menu';
    estado.dados = {};
    estado.atendenteAtivo = false;
    estado.contadorMensagens = 0;
  }

  estado.ultimaInteracao = agora;

  // ====== DETECÇÃO AUTOMÁTICA: após mensagens do cliente aguardando ======
  if (estado.etapa === 'aguardandoAtendente' && !estado.atendenteAtivo) {
    estado.contadorMensagens = (estado.contadorMensagens || 0) + 1;

    if (estado.contadorMensagens >= 3) {
      estado.atendenteAtivo = true;
      console.log(`👤 Atendente assumiu automaticamente conversa com ${from} (cliente insistiu ${estado.contadorMensagens}x)`);
    }
  }

  // Para aguardandoConfirmacao, silencia após 1 mensagem apenas
  if (estado.etapa === 'aguardandoConfirmacao' && !estado.atendenteAtivo) {
    estado.contadorMensagens = (estado.contadorMensagens || 0) + 1;

    if (estado.contadorMensagens >= 2) {
      estado.atendenteAtivo = true;
      console.log(`👤 Atendente assumiu automaticamente conversa com ${from} (pós-agendamento, cliente insistiu ${estado.contadorMensagens}x)`);
    }
  }

  // ====== SE ATENDENTE ESTÁ ATIVO, BOT FICA QUIETO ======
  if (estado.atendenteAtivo) {
    if (body === '0') {
      estado.atendenteAtivo = false;
      estado.etapa = 'menu';
      estado.dados = {};
      estado.contadorMensagens = 0;
      console.log(`🤖 Bot reassumiu conversa com ${from}`);
      await enviarComDigitando(message, menuPrincipal);
    }
    return;
  }

  // ====== SE CLIENTE DIGITA 0, VOLTA PRO MENU ======
  if (body === '0') {
    estado.etapa = 'menu';
    estado.dados = {};
    estado.atendenteAtivo = false;
    estado.contadorMensagens = 0;
    await enviarComDigitando(message, menuPrincipal);
    return;
  }

  // ====== FLUXO PRINCIPAL ======
  switch (estado.etapa) {
    case 'menu':
      if (!['1', '2', '3', '4', '5'].includes(body)) {
        await enviarComDigitando(message, menuPrincipal);
        return;
      }

      if (body === '1') {
        estado.etapa = 'perguntarNome';
        await enviarComDigitando(
          message,
          `Perfeito! 📋 Vamos agendar sua avaliação.\n\n` +
          `Primeiro, me diga por favor: *qual seu nome completo?*`
        );
      } else if (body === '2') {
        estado.etapa = 'verProcedimentos';
        await enviarComDigitando(message, procedimentosTexto);
      } else if (body === '3') {
        estado.etapa = 'aguardandoAtendente';
        estado.contadorMensagens = 0;
        await enviarComDigitando(
          message,
          `Entendido! 👤\n\n` +
          `Vou te conectar com uma de nossas consultoras de vendas.\n` +
          `*Aguarde só um instantinho...* ⏱️\n\n` +
          `Uma atendente já foi avisada e vai te responder em instantes por aqui. 🙋‍♀️\n\n` +
          `*Horários de atendimento no Patos Shopping:*\n` +
          `• Segunda a Sábado: 10h às 22h\n` +
          `• Domingo: 12h às 22h\n\n` +
          `Se em algum momento quiser voltar para o menu automático, é só digitar *0*.`
        );
        console.log(`🔔 Cliente ${from} solicitou atendente`);
      } else if (body === '4') {
        await enviarComDigitando(
          message,
          `📍 *NOSSA LOCALIZAÇÃO*\n\n` +
          `PATOS SHOPPING - Próximo da UNIFIP\n` +
          `* Em frente ao sorvete da Burguer King\n` +
          `* Patos - PB\n\n` +
          `🚗 Estacionamento no local, climatização e horários flexíveis\n\n` +
          `Digite *0* para voltar ao menu.`
        );
      } else if (body === '5') {
        estado.etapa = 'duvidas';
        await enviarComDigitando(message, duvidasMenu);
      }
      break;

    case 'verProcedimentos':
      if (body === '1') {
        estado.etapa = 'perguntarNome';
        await enviarComDigitando(
          message,
          `Perfeito! 📋 Vamos agendar sua avaliação.\n\n` +
          `Primeiro, me diga por favor: *qual seu nome completo?*`
        );
      } else {
        await enviarComDigitando(message, menuPrincipal);
        estado.etapa = 'menu';
      }
      break;

    case 'perguntarNome':
      estado.dados.nome = body;
      estado.etapa = 'perguntarTratamento';
      await enviarComDigitando(
        message,
        `Prazer, *${estado.dados.nome}*! 😄\n\n` +
        `Agora me conta: *qual tratamento te interessa mais no momento?*\n\n` +
        `Você pode responder, por exemplo:\n` +
        `• Botox 3 regiões;\n` +
        `• Preenchimento (labial, rinomodelação, bigode chinês, malar, mento, mandíbula, marionete e olheiras);\n` +
        `• Bioestimulador de colágeno;\n` +
        `• Outro;`
      );
      break;

    case 'perguntarTratamento':
      estado.dados.tratamento = body;
      estado.etapa = 'perguntarHorario';
      await enviarComDigitando(
        message,
        `Perfeito! 💎\n\n` +
        `Qual o melhor *dia e horário* para sua avaliação?\n\n` +
        `*Horários de atendimento:*\n` +
        `• Segunda à Sábado: 10h às 22h\n` +
        `• Domingo: 12h às 22h\n\n` +
        `Você pode responder, por exemplo: *terça às 15h*`
      );
      break;

    case 'perguntarHorario':
      estado.dados.horario = body;

      await enviarComDigitando(
        message,
        `Ótimo, *${estado.dados.nome}*! ✅\n\n` +
        `Resumo do seu pedido de avaliação:\n\n` +
        `👤 Nome: *${estado.dados.nome}*\n` +
        `💎 Tratamento de interesse: *${estado.dados.tratamento}*\n` +
        `📅 Melhor dia/horário: *${estado.dados.horario}*\n\n` +
        `Vou passar essas informações para nossa equipe agora mesmo,\n` +
        `e uma atendente vai confirmar sua avaliação por aqui. 🙋‍♀️\n\n` +
        `Se precisar de algo, pode ir me mandando mensagem normalmente.\n\n` +
        `Quando quiser ver o menu novamente, é só digitar *0*.`
      );

      console.log('📝 NOVO LEAD DE AVALIAÇÃO:', {
        numero: from,
        ...estado.dados
      });

      estado.etapa = 'aguardandoConfirmacao';
      estado.contadorMensagens = 0;
      break;

    case 'aguardandoConfirmacao':
      // Só responde na primeira vez que o cliente insiste
      if (estado.contadorMensagens < 2) {
        await enviarComDigitando(
          message,
          `Seu pedido já está registrado! 📋\n\n` +
          `Uma atendente vai te responder em breve para confirmar os detalhes. 🙋‍♀️\n\n` +
          `*Horários de atendimento no Patos Shopping:*\n` +
          `• Segunda a Sábado: 10h às 22h\n` +
          `• Domingo: 12h às 22h\n\n` +
          `Se quiser voltar ao menu principal, digite *0*.`,
          2000
        );
      }
      break;

    case 'duvidas':
      if (duvidasRespostas[body]) {
        // Envia a resposta da dúvida
        await enviarComDigitando(message, duvidasRespostas[body], 2000);

        // Aguarda 1 segundo e mostra o menu de dúvidas novamente
        await delay(1000);
        await enviarComDigitando(message, `\n\n` + duvidasMenu, 2000);
      } else {
        await enviarComDigitando(
          message,
          `Não entendi essa opção. 🤔\n\n` + duvidasMenu
        );
      }
      break;

    case 'aguardandoAtendente':
      if (estado.contadorMensagens < 3) {
        await enviarComDigitando(
          message,
          `Uma atendente já foi avisada e vai te responder em instantes. 🙋‍♀️\n\n` +
          `Se quiser voltar ao menu automático, digite *0*.`
        );
      }
      break;

    default:
      estado.etapa = 'menu';
      estado.dados = {};
      estado.atendenteAtivo = false;
      estado.contadorMensagens = 0;
      await enviarComDigitando(message, menuPrincipal);
  }
});

// Inicializa o bot
console.log('🚀 Iniciando bot da Botocenter Patos com fluxo completo...');
client.initialize();
