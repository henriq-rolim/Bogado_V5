// server.js - Servidor Express para interface web de controle da automação
require('dotenv').config();
const express = require('express');
const path = require('path');
const automation = require('./automation');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para processar JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal - Página de controle
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// API para iniciar a automação
app.post('/api/start', (req, res) => {
  const result = automation.startAutomation();
  res.json(result);
});

// API para parar a automação
app.post('/api/stop', (req, res) => {
  const result = automation.stopAutomation();
  res.json(result);
});

// API para obter o status atual
app.get('/api/status', (req, res) => {
  const status = automation.getStatus();
  res.json(status);
});

// Verificar variáveis de ambiente antes de iniciar o servidor
if (!automation.validateEnv()) {
  console.error('Erro: Variáveis de ambiente necessárias não encontradas. O servidor será iniciado, mas a automação não funcionará corretamente.');
}

// Iniciar o servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log('Para acessar a interface de controle, abra o navegador no endereço acima.');
  console.log('A automação está inicialmente PARADA. Use a interface web para iniciá-la.');
});
