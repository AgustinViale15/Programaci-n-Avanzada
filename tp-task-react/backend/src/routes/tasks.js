import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// 1. Listar todas las tareas
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tasks ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Crear una nueva tarea
router.post('/', async (req, res) => {
  const {
    projectName,
    activityType,
    status,
    summary,
    description,
    priority,
    reporter,
    assignee,
    precondition,
    sprint,
  } = req.body;

  try {
    const query = `
      INSERT INTO tasks (
        project_name, activity_type, status, summary, description,
        priority, reporter, assignee, precondition, sprint
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const values = [
      projectName,
      activityType,
      status || 'Pendiente',
      summary,
      description,
      priority,
      reporter,
      assignee,
      precondition,
      sprint,
    ];

    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error al crear tarea:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Editar una tarea existente
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    projectName,
    activityType,
    status,
    summary,
    description,
    priority,
    reporter,
    assignee,
    precondition,
    sprint,
  } = req.body;

  try {
    const query = `
      UPDATE tasks SET
        project_name = $1,
        activity_type = $2,
        status = $3,
        summary = $4,
        description = $5,
        priority = $6,
        reporter = $7,
        assignee = $8,
        precondition = $9,
        sprint = $10
      WHERE id = $11
      RETURNING *;
    `;
    const values = [
      projectName,
      activityType,
      status,
      summary,
      description,
      priority,
      reporter,
      assignee,
      precondition,
      sprint,
      id,
    ];

    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Finalizar tarea (actualiza estado y registra fecha de cierre)
router.patch('/:id/finish', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      UPDATE tasks 
      SET status = 'Finalizada', closed_at = NOW() 
      WHERE id = $1 
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al finalizar tarea:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Eliminar tarea
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    res.sendStatus(204);
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;