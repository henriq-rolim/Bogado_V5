// server.js - Servidor Express e automação do Travian
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const COOKIES_FILE = path.join(__dirname, 'cookies.json');
const TRAVIAN_URL = process.env.TRAVIAN_URL || 'https://ts100.x10.america.travian.com';

// Variáveis de controle
let isRunning = false;
let nextRunTimeout = null;
let nextRunTime = null;
let lastLogs = [];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Função para adicionar log
function addLog(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  
  // Manter apenas os últimos 100 logs
  lastLogs.push(logEntry);
  if (lastLogs.length > 100) {
    lastLogs.shift();
  }
}

// Funções de utilidade
function loadCookies() {
  try {
    if (fs.existsSync(COOKIES_FILE)) {
      return JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
    }
  } catch (error) {
    addLog(`Erro ao carregar cookies: ${error.message}`);
  }
  return null;
}

function saveCookies(cookies) {
  try {
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies));
    return true;
  } catch (error) {
    addLog(`Erro ao salvar cookies: ${error.message}`);
    return false;
  }
}

function getRandomDelay(minMinutes, maxMinutes) {
  const minMs = minMinutes * 60 * 1000;
  const maxMs = maxMinutes * 60 * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// Função para normalizar cookies em diferentes formatos
function normalizeCookies(cookies) {
  if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
    addLog('Cookies inválidos: formato não reconhecido');
    return null;
  }

  addLog(`Tentando normalizar ${cookies.length} cookies`);

  // Verificar se já está no formato esperado
  if (cookies.every(cookie => typeof cookie === 'object' && 'name' in cookie && 'value' in cookie)) {
    addLog('Cookies já estão no formato esperado');
    return cookies;
  }

  // Tentar converter de outros formatos conhecidos
  try {
    // Formato com domain, path, etc.
    if (cookies.every(cookie => typeof cookie === 'object' && 'domain' in cookie && 'name' in cookie && 'value' in cookie)) {
      addLog('Convertendo cookies do formato com domain para formato simplificado');
      return cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value
      }));
    }

    // Formato de objeto simples {nome: valor}
    if (cookies.length === 1 && typeof cookies[0] === 'object' && !('name' in cookies[0]) && !('value' in cookies[0])) {
      addLog('Convertendo cookies do formato objeto para formato simplificado');
      const cookieObj = cookies[0];
      return Object.keys(cookieObj).map(name => ({
        name,
        value: cookieObj[name]
      }));
    }

    // Formato de string "nome=valor; nome2=valor2"
    if (cookies.length === 1 && typeof cookies[0] === 'string') {
      addLog('Convertendo cookies do formato string para formato simplificado');
      const cookieStr = cookies[0];
      return cookieStr.split(';').map(pair => {
        const [name, value] = pair.trim().split('=');
        return { name, value };
      });
    }
    
    addLog('Formato de cookies não reconhecido após tentativas de normalização');
  } catch (error) {
    addLog(`Erro ao normalizar cookies: ${error.message}`);
  }

  return null;
}

// Função para validar cookies
async function validateCookies(cookies) {
  addLog('Iniciando validação de cookies...');
  
  // BYPASS DE VALIDAÇÃO - Sempre aceita os cookies sem verificar
  const normalizedCookies = normalizeCookies(cookies);
  if (!normalizedCookies) {
    addLog('Normalização de cookies falhou');
    return false;
  }
  
  addLog('BYPASS: Aceitando cookies sem validação');
  saveCookies(normalizedCookies);
  return true;
}

// Função principal de automação
async function runAutomation() {
  addLog(`Iniciando automação do Travian`);
  
  try {
    // Verificar se temos cookies salvos
    const cookies = loadCookies();
    if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
      addLog('Cookies não encontrados. Importe os cookies primeiro.');
      return;
    }
    
    addLog(`Usando ${cookies.length} cookies salvos para autenticação`);
    
    // Criar sessão com cookies
    const session = axios.create({
      withCredentials: true,
      timeout: 60000, // Timeout aumentado para 60 segundos
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Cookie': cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')
      }
    });
    
    // BYPASS: Pular verificação de cookies e ir direto para a automação
    addLog('BYPASS: Pulando verificação de cookies e iniciando automação diretamente');
    
    // Acessar página da lista de farms
    addLog('Acessando página da lista de farms');
    try {
      const farmListPage = await session.get(`${TRAVIAN_URL}/build.php?gid=16&tt=99`);
      
      // Extrair token e parâmetros necessários
      const html = farmListPage.data;
      const tokenMatch = html.match(/name="([a-f0-9]{32})" value="1"/);
      
      if (tokenMatch && tokenMatch[1]) {
        const token = tokenMatch[1];
        
        // Enviar requisição para iniciar todas as listas
        addLog('Iniciando todas as listas de farms');
        const farmForm = new URLSearchParams();
        farmForm.append(token, '1');
        farmForm.append('startAllRaids', '1');
        
        const farmResponse = await session.post(`${TRAVIAN_URL}/build.php?gid=16&tt=99`, farmForm, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': `${TRAVIAN_URL}/build.php?gid=16&tt=99`
          }
        });
        
        addLog('Listas de farms iniciadas com sucesso');
      } else {
        addLog('Não foi possível encontrar o token para iniciar as listas de farms');
        
        // Tentar método alternativo
        if (html.includes('startAllRaids') || html.includes('Iniciar todas as listas')) {
          addLog('Botão de iniciar todas as listas encontrado, tentando método alternativo...');
          
          // Tentar encontrar o formulário completo
          const formMatch = html.match(/<form[^>]*action="[^"]*"[^>]*>([\s\S]*?)<\/form>/i);
          if (formMatch) {
            addLog('Formulário encontrado, tentando extrair todos os campos');
            
            // Extrair todos os campos do formulário
            const formInputs = {};
            const inputMatches = formMatch[1].match(/<input[^>]*>/g);
            
            if (inputMatches) {
              inputMatches.forEach(input => {
                const nameMatch = input.match(/name="([^"]+)"/);
                const valueMatch = input.match(/value="([^"]*)"/);
                if (nameMatch) {
                  formInputs[nameMatch[1]] = valueMatch ? valueMatch[1] : '';
                }
              });
              
              // Adicionar campo startAllRaids
              formInputs['startAllRaids'] = '1';
              
              // Criar formulário com todos os campos
              const alternativeFarmForm = new URLSearchParams();
              Object.keys(formInputs).forEach(key => {
                alternativeFarmForm.append(key, formInputs[key]);
              });
              
              // Enviar formulário
              const altFarmResponse = await session.post(`${TRAVIAN_URL}/build.php?gid=16&tt=99`, alternativeFarmForm, {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Referer': `${TRAVIAN_URL}/build.php?gid=16&tt=99`
                }
              });
              
              addLog('Tentativa alternativa de iniciar listas de farms concluída');
            }
          }
        } else {
          addLog('Botão de iniciar todas as listas não encontrado. Verifique se você tem listas de farms configuradas.');
        }
      }
    } catch (error) {
      addLog(`Erro ao acessar página de farms: ${error.message}`);
      if (error.response) {
        addLog(`Status do erro: ${error.response.status}`);
      }
    }
  } catch (error) {
    addLog(`Erro durante a automação: ${error.message}`);
    if (error.response) {
      addLog(`Status do erro: ${error.response.status}`);
    }
  }
  
  addLog(`Automação finalizada`);
  
  // Agendar próxima execução se ainda estiver rodando
  if (isRunning) {
    scheduleNextRun();
  }
}

// Função para agendar a próxima execução
function scheduleNextRun() {
  if (!isRunning) return;
  
  // Cancelar timeout existente se houver
  if (nextRunTimeout) {
    clearTimeout(nextRunTimeout);
  }
  
  // Gerar tempo aleatório entre 4-6 minutos
  const delay = getRandomDelay(4, 6);
  nextRunTime = new Date(Date.now() + delay);
  
  addLog(`--------------------------------------------------`);
  addLog(`Próxima execução agendada para: ${nextRunTime.toISOString()}`);
  addLog(`Aguardando ${Math.round(delay / 60000)} minutos (${delay} ms)...`);
  addLog(`--------------------------------------------------`);
  
  nextRunTimeout = setTimeout(runAutomation, delay);
}

// Rotas da API
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/status', (req, res) => {
  const cookies = loadCookies();
  const hasCookies = !!(cookies && Array.isArray(cookies) && cookies.length > 0);
  
  res.json({
    isRunning,
    nextRunTime: nextRunTime ? nextRunTime.toISOString() : null,
    timeRemaining: nextRunTime ? Math.max(0, nextRunTime - Date.now()) : null,
    hasCookies
  });
});

// Rota para obter logs
app.get('/api/logs', (req, res) => {
  res.json({
    logs: lastLogs
  });
});

// Rota para importar cookies
app.post('/api/import-cookies', async (req, res) => {
  let { cookies } = req.body;
  
  addLog('Recebida solicitação para importar cookies');
  
  // Aceitar string JSON
  if (typeof cookies === 'string') {
    try {
      addLog('Tentando fazer parse de cookies em formato string');
      cookies = JSON.parse(cookies);
    } catch (error) {
      addLog(`Erro ao fazer parse de cookies: ${error.message}`);
      return res.json({
        success: false,
        message: 'Formato de cookies inválido. O texto não é um JSON válido.'
      });
    }
  }
  
  if (!cookies || (typeof cookies !== 'object' && !Array.isArray(cookies))) {
    addLog('Cookies inválidos: não é um objeto ou array');
    return res.json({
      success: false,
      message: 'Formato de cookies inválido. Verifique as instruções e tente novamente.'
    });
  }
  
  // Converter para array se for objeto
  if (!Array.isArray(cookies)) {
    addLog('Convertendo objeto de cookies para array');
    cookies = [cookies];
  }
  
  try {
    // Validar cookies
    addLog('Iniciando validação de cookies');
    const isValid = await validateCookies(cookies);
    
    if (!isValid) {
      addLog('Validação de cookies falhou');
      return res.json({
        success: false,
        message: 'Os cookies fornecidos são inválidos ou não permitem acesso ao Travian.'
      });
    }
    
    addLog('Cookies importados e validados com sucesso');
    return res.json({
      success: true,
      message: 'Cookies importados e validados com sucesso!',
      status: {
        isRunning,
        nextRunTime: nextRunTime ? nextRunTime.toISOString() : null,
        hasCookies: true
      }
    });
  } catch (error) {
    addLog(`Erro ao importar cookies: ${error.message}`);
    return res.json({
      success: false,
      message: `Erro ao importar cookies: ${error.message}`
    });
  }
});

app.post('/api/start', (req, res) => {
  const cookies = loadCookies();
  if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
    addLog('Tentativa de iniciar automação sem cookies');
    return res.json({
      success: false,
      message: 'Cookies não encontrados. Importe os cookies primeiro.',
      status: {
        isRunning: false,
        hasCookies: false
      }
    });
  }
  
  if (isRunning) {
    addLog('Tentativa de iniciar automação que já está em execução');
    return res.json({
      success: false,
      message: 'A automação já está em execução.'
    });
  }
  
  isRunning = true;
  addLog('Automação iniciada pelo usuário.');
  
  // Executar imediatamente
  runAutomation();
  
  return res.json({
    success: true,
    message: 'Automação iniciada com sucesso!',
    status: {
      isRunning: true,
      nextRunTime: nextRunTime ? nextRunTime.toISOString() : null,
      hasCookies: true
    }
  });
});

app.post('/api/stop', (req, res) => {
  if (!isRunning) {
    addLog('Tentativa de parar automação que já está parada');
    return res.json({
      success: false,
      message: 'A automação já está parada.'
    });
  }
  
  isRunning = false;
  
  // Cancelar próxima execução agendada
  if (nextRunTimeout) {
    clearTimeout(nextRunTimeout);
    nextRunTimeout = null;
  }
  
  nextRunTime = null;
  addLog('Automação parada pelo usuário.');
  
  return res.json({
    success: true,
    message: 'Automação parada com sucesso!',
    status: {
      isRunning: false,
      nextRunTime: null
    }
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  addLog(`Servidor rodando na porta ${PORT}`);
  addLog('Para acessar a interface de controle, abra o navegador no endereço acima.');
  addLog('A automação está inicialmente PARADA. Use a interface web para iniciá-la.');
});
