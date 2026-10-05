import { useState, useEffect } from 'react';

const initialValues = {
  projectName: '',
  activityType: 'Desarrollo',
  status: 'Pendiente',
  summary: '',
  description: '',
  priority: 'Media',
  reporter: '',
  assignee: '',
  precondition: '',
  sprint: ''
};

export default function TaskForm({ onSubmit, taskToEdit, onCancelEdit }) {
  const [form, setForm] = useState(initialValues);

  useEffect(() => {
    if (taskToEdit) {
      setForm({
        projectName: taskToEdit.project_name || '',
        activityType: taskToEdit.activity_type || 'Desarrollo',
        status: taskToEdit.status || 'Pendiente',
        summary: taskToEdit.summary || '',
        description: taskToEdit.description || '',
        priority: taskToEdit.priority || 'Media',
        reporter: taskToEdit.reporter || '',
        assignee: taskToEdit.assignee || '',
        precondition: taskToEdit.precondition || '',
        sprint: taskToEdit.sprint || ''
      });
    } else {
      setForm(initialValues);
    }
  }, [taskToEdit]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    setForm(initialValues);
  };

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '16px', borderRadius: '8px', minWidth: '320px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h3>{taskToEdit ? 'Editar Tarea' : 'Crear Tarea'}</h3>
      
      <label>Proyecto:
        <input name="projectName" value={form.projectName} onChange={handleChange} required style={{ width: '100%' }} />
      </label>

      <label>Tipo de Actividad:
        <select name="activityType" value={form.activityType} onChange={handleChange} style={{ width: '100%' }}>
          <option value="Desarrollo">Desarrollo</option>
          <option value="Bug">Bug</option>
          <option value="Testing">Testing</option>
          <option value="Diseño">Diseño</option>
        </select>
      </label>

      <label>Estado:
        <select name="status" value={form.status} onChange={handleChange} style={{ width: '100%' }}>
          <option value="Pendiente">Pendiente</option>
          <option value="En Progreso">En Progreso</option>
          <option value="Finalizada">Finalizada</option>
        </select>
      </label>

      <label>Resumen:
        <input name="summary" value={form.summary} onChange={handleChange} required style={{ width: '100%' }} />
      </label>

      <label>Descripción:
        <textarea name="description" value={form.description} onChange={handleChange} rows="2" style={{ width: '100%' }} />
      </label>

      <label>Prioridad:
        <select name="priority" value={form.priority} onChange={handleChange} style={{ width: '100%' }}>
          <option value="Baja">Baja</option>
          <option value="Media">Media</option>
          <option value="Alta">Alta</option>
          <option value="Bloqueante">Bloqueante</option>
        </select>
      </label>

      <label>Informador:
        <input name="reporter" value={form.reporter} onChange={handleChange} required style={{ width: '100%' }} />
      </label>

      <label>Persona Asignada:
        <input name="assignee" value={form.assignee} onChange={handleChange} style={{ width: '100%' }} />
      </label>

      <label>Precondición:
        <input name="precondition" value={form.precondition} onChange={handleChange} style={{ width: '100%' }} />
      </label>

      <label>Sprint:
        <input name="sprint" value={form.sprint} onChange={handleChange} placeholder="Ej: Sprint 1" style={{ width: '100%' }} />
      </label>

      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <button type="submit" style={{ flex: 1, padding: '8px' }}>
          {taskToEdit ? 'Guardar Cambios' : 'Registrar Tarea'}
        </button>
        {taskToEdit && (
          <button type="button" onClick={onCancelEdit} style={{ padding: '8px' }}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}