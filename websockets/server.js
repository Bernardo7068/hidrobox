import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' } // Em produção, restringe para o domínio do teu frontend
});

const PORT = process.env.PORT || 3001;
const API_SECRET = process.env.INTERNAL_API_SECRET || 'chave-secreta-interna-hidrobox';

// 1. Ouvir ligações WebSocket do Frontend
io.on('connection', (socket) => {
  console.log(`[WS] Cliente conectado: ${socket.id}`);

  // O utilizador do frontend junta-se ao canal privado da sua empresa
  socket.on('join-company', (empresaId) => {
    socket.join(`empresa_${empresaId}`);
    console.log(`[WS] Cliente ${socket.id} entrou no canal da empresa: ${empresaId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Cliente desconectado: ${socket.id}`);
  });
});

// 2. Receber alertas/leituras do Laravel via Webhook e transmitir aos clientes
app.post('/api/broadcast', (req, res) => {
  const token = req.headers['x-internal-token'];

  // Segurança: Apenas a tua API Laravel pode fazer pedidos a este endpoint
  if (token !== API_SECRET) {
    return res.status(403).json({ error: 'Não autorizado.' });
  }

  const { empresa_id, event, data } = req.body;

  if (!empresa_id || !event || !data) {
    return res.status(400).json({ error: 'Faltam dados obrigatórios (empresa_id, event, data).' });
  }

  // Transmite para todos os clientes daquela empresa específica
  io.to(`empresa_${empresa_id}`).emit(event, data);
  console.log(`[Broadcast] Evento "${event}" enviado para a empresa ${empresa_id}`);

  return res.json({ success: true });
});

httpServer.listen(PORT, () => {
  console.log(`[WebSocket] Servidor ativo em http://localhost:${PORT}`);
});