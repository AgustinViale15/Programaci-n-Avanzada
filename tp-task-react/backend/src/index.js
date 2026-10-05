import express from 'express';
import cors from 'cors';
import tasksRouter from './routes/tasks.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Ruta principal para el CRUD de tareas
app.use('/api/tasks', tasksRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});