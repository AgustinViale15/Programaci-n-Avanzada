import { useState, useEffect } from 'react';
import axios from 'axios';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [taskToEdit, setTaskToEdit] = useState(null);

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_URL}/tasks`);
      setTasks(res.data);
    } catch (error) {
      console.error('Error al cargar tareas:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateOrUpdate = async (formData) => {
    try {
      if (taskToEdit) {
        await axios.put(`${API_URL}/tasks/${taskToEdit.id}`, formData);
        setTaskToEdit(null);
      } else {
        await axios.post(`${API_URL}/tasks`, formData);
      }
      fetchTasks();
    } catch (error) {
      console.error('Error al guardar tarea:', error);
    }
  };

  const handleFinish = async (id) => {
    try {
      await axios.patch(`${API_URL}/tasks/${id}/finish`);
      fetchTasks();
    } catch (error) {
      console.error('Error al finalizar tarea:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que querés eliminar esta tarea?')) return;
    try {
      await axios.delete(`${API_URL}/tasks/${id}`);
      fetchTasks();
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '24px' }}>Manejador de Tareas</h1>
      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
        <TaskForm
          onSubmit={handleCreateOrUpdate}
          taskToEdit={taskToEdit}
          onCancelEdit={() => setTaskToEdit(null)}
        />
        <TaskList
          tasks={tasks}
          onEdit={(task) => setTaskToEdit(task)}
          onDelete={handleDelete}
          onFinish={handleFinish}
        />
      </div>
    </div>
  );
}