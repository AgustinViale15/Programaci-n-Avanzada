export default function TaskList({ tasks, onEdit, onDelete, onFinish }) {
  return (
    <div style={{ flex: 1 }}>
      <h2>Listado de Tareas</h2>
      {tasks.length === 0 ? (
        <p>No hay tareas registradas.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                border: '1px solid #ddd',
                padding: '12px',
                borderRadius: '6px',
                backgroundColor: task.status === 'Finalizada' ? '#f0fdf4' : '#ffffff'
              }}
            >
              <h3 style={{ margin: '0 0 6px 0' }}>{task.summary}</h3>
              <p style={{ margin: '4px 0' }}><strong>Proyecto:</strong> {task.project_name} | <strong>Sprint:</strong> {task.sprint || 'N/A'}</p>
              <p style={{ margin: '4px 0' }}><strong>Tipo:</strong> {task.activity_type} | <strong>Prioridad:</strong> {task.priority}</p>
              <p style={{ margin: '4px 0' }}><strong>Estado:</strong> <b>{task.status}</b></p>
              <p style={{ margin: '4px 0' }}><strong>Descripción:</strong> {task.description || 'Sin descripción'}</p>
              <p style={{ margin: '4px 0' }}><strong>Precondición:</strong> {task.precondition || 'Ninguna'}</p>
              <p style={{ margin: '4px 0' }}><strong>Informador:</strong> {task.reporter} | <strong>Asignado:</strong> {task.assignee || 'Sin asignar'}</p>
              <p style={{ margin: '4px 0', fontSize: '0.85em', color: '#666' }}>
                <strong>Creado:</strong> {new Date(task.created_at).toLocaleString()}
                {task.closed_at && ` | Cerrado: ${new Date(task.closed_at).toLocaleString()}`}
              </p>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => onEdit(task)}>Editar</button>
                {task.status !== 'Finalizada' && (
                  <button onClick={() => onFinish(task.id)} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                    Finalizar
                  </button>
                )}
                <button onClick={() => onDelete(task.id)} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}