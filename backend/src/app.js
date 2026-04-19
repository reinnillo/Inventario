// backend/src/app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Importamos rutas
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import countingRoutes from './routes/countingRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import pdfRoutes from './routes/pdfRoutes.js';
import supervisionRoutes from './routes/supervisionRoutes.js';
import guestRoutes from './routes/guestRoutes.js';
import statsRoutes from './routes/statsRoutes.js';  


// ================= CONFIGURACIÓN =================

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL
];

// ================= MIDDLEWARES =================
app.use(express.json({ limit: '50mb' })); // Aumentamos límite para cargas masivas

app.use(cors({
  origin: (origin, callback) => {
    // Permitir solicitudes sin origen (como Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));

// ================= RUTAS =================
app.use('/api', userRoutes);       
app.use('/api', clientRoutes);     
app.use('/api', countingRoutes);   
app.use('/api', inventoryRoutes);
app.use('/api', reportsRoutes);
app.use('/api/reportes', pdfRoutes);
app.use('/api', supervisionRoutes);
app.use('/api', guestRoutes);
app.use('/api', statsRoutes);

app.use('/api/auth', authRoutes);  

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', system: 'reinnillo Backend v2.5', time: new Date() });
});

// ================= INICIO =================
console.log("🔗 Conectando a Supabase en:", process.env.SUPABASE_URL);
app.listen(PORT, () => {
  console.log(`📡 Rutas activas: Auth, Usuarios, Clientes, Conteos, Verificación.`);
});