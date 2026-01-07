
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import DottedGlowBackground from './components/DottedGlowBackground';
import { SparklesIcon, ThinkingIcon } from './components/Icons';

type Priority = 'Alta' | 'Media' | 'Baja';

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  completed: boolean;
  createdAt: number;
}

const TaskManagerApp = () => {
  // Estados de Tareas y Filtros
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterPriority, setFilterPriority] = useState<Priority | 'Todas'>('Todas');
  const [filterStatus, setFilterStatus] = useState<'Todas' | 'Pendientes' | 'Completadas'>('Todas');
  
  // Estados de UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; visible: boolean; onUndo?: () => void } | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);

  // Estados del Formulario (con valores iniciales claros)
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState<Priority>('Media');
  const [formDate, setFormDate] = useState('');

  // Persistencia inicial
  useEffect(() => {
    const saved = localStorage.getItem('android_tasks_final_v1');
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        console.error("Error cargando tareas", e);
      }
    }
  }, []);

  // Guardado automático
  useEffect(() => {
    localStorage.setItem('android_tasks_final_v1', JSON.stringify(tasks));
  }, [tasks]);

  const showToast = (message: string, onUndo?: () => void) => {
    if (undoTimeoutRef.current) window.clearTimeout(undoTimeoutRef.current);
    setSnackbar({ message, visible: true, onUndo });
    undoTimeoutRef.current = window.setTimeout(() => setSnackbar(null), 5000);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const taskData = {
      title: formTitle.trim(),
      description: formDesc.trim(),
      priority: formPriority,
      dueDate: formDate,
    };

    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskData } : t));
      showToast("Tarea actualizada con éxito");
    } else {
      const newTask: Task = {
        id: Math.random().toString(36).substring(2, 11),
        ...taskData,
        completed: false,
        createdAt: Date.now()
      };
      setTasks(prev => [newTask, ...prev]);
      showToast("Nueva tarea creada");
    }
    closeModal();
  };

  const deleteTask = useCallback((id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    showToast("Tarea eliminada", () => {
      setTasks(prev => [taskToDelete, ...prev].sort((a,b) => b.createdAt - a.createdAt));
    });
  }, [tasks]);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const openModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormTitle(task.title);
      setFormDesc(task.description);
      setFormPriority(task.priority);
      setFormDate(task.dueDate);
    } else {
      setEditingTask(null);
      setFormTitle('');
      setFormDesc('');
      setFormPriority('Media');
      setFormDate('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const filteredTasks = tasks.filter(t => {
    const pMatch = filterPriority === 'Todas' || t.priority === filterPriority;
    const sMatch = filterStatus === 'Todas' || (filterStatus === 'Completadas' ? t.completed : !t.completed);
    return pMatch && sMatch;
  }).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="app-shell android-theme">
      <DottedGlowBackground opacity={0.15} />
      
      {/* Barra de Navegación Superior Estilo Android */}
      <nav className="top-nav">
        <div className="nav-container">
          <div className="logo-section">
            <span className="logo-dot pulse"></span>
            <h1>TaskMaster Pro</h1>
          </div>
          <div className="nav-filters">
            <select 
              className="android-select"
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="Todas">Estados</option>
              <option value="Pendientes">Pendientes</option>
              <option value="Completadas">Hechas</option>
            </select>
          </div>
        </div>
      </nav>

      {/* Chips de Filtrado de Prioridad */}
      <header className="filter-bar">
        <div className="chip-container no-scrollbar">
          {(['Todas', 'Baja', 'Media', 'Alta'] as const).map(p => (
            <button 
              key={p}
              className={`chip ${filterPriority === p ? 'active' : ''} ${p !== 'Todas' ? 'p-' + p.toLowerCase() : ''}`} 
              onClick={() => setFilterPriority(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </header>

      {/* Área de Contenido Principal */}
      <main className="content-area">
        {filteredTasks.length === 0 ? (
          <div className="empty-state animate-fade-in">
            <div className="empty-icon"><ThinkingIcon /></div>
            <h2>Todo en orden</h2>
            <p>No hay tareas que mostrar. Pulsa el botón + para añadir una.</p>
          </div>
        ) : (
          <div className="task-list">
            {filteredTasks.map(task => (
              <div key={task.id} className={`task-item ${task.completed ? 'is-completed' : ''} priority-${task.priority.toLowerCase()}`}>
                <div className="task-check" onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}>
                  <div className={`checkbox-custom ${task.completed ? 'checked' : ''}`}></div>
                </div>
                <div className="task-body" onClick={() => openModal(task)}>
                  <div className="task-main">
                    <h3>{task.title}</h3>
                    <span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span>
                  </div>
                  {task.description && <p className="desc-text">{task.description}</p>}
                  {task.dueDate && (
                    <div className="task-meta">
                      <span className="icon-calendar">📅</span>
                      {new Date(task.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  )}
                </div>
                <button className="delete-action-btn" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}>
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Botón Flotante (FAB) */}
      <button className="fab ripple" onClick={() => openModal()} aria-label="Añadir tarea">
        <span className="fab-plus">+</span>
      </button>

      {/* Modal de Edición / Creación */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-drag-handle"></div>
            <div className="modal-header">
              <h2>{editingTask ? 'Editar tarea' : 'Nueva tarea'}</h2>
              <button className="close-sheet" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSaveTask}>
              <div className="input-group">
                <input 
                  autoFocus
                  className="main-input"
                  value={formTitle} 
                  onChange={e => setFormTitle(e.target.value)} 
                  placeholder="Título de la tarea"
                  required
                />
              </div>
              <div className="input-group">
                <textarea 
                  className="desc-input"
                  value={formDesc} 
                  onChange={e => setFormDesc(e.target.value)} 
                  placeholder="Detalles adicionales..."
                  rows={2}
                />
              </div>
              
              <div className="input-group">
                <label className="section-label">Prioridad del Sprint</label>
                <div className="priority-selector-grid">
                  {(['Baja', 'Media', 'Alta'] as Priority[]).map(p => (
                    <button 
                      key={p}
                      type="button"
                      className={`p-selector-btn ${p.toLowerCase()} ${formPriority === p ? 'is-selected' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setFormPriority(p);
                      }}
                    >
                      <div className="dot"></div>
                      <span>{p}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="section-label">Fecha Límite (Avisos HU-07)</label>
                <input 
                  type="datetime-local" 
                  className="date-input"
                  value={formDate} 
                  onChange={e => setFormDate(e.target.value)} 
                />
              </div>

              <div className="modal-footer">
                <button type="submit" className="submit-btn-android ripple">
                  {editingTask ? 'Actualizar Tarea' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Snackbar / Toast de Android */}
      {snackbar && (
        <div className={`android-toast ${snackbar.visible ? 'show' : ''}`}>
          <div className="toast-body">
            <span className="toast-msg">{snackbar.message}</span>
            {snackbar.onUndo && (
              <button className="undo-action" onClick={() => {
                snackbar.onUndo?.();
                setSnackbar(null);
              }}>DESHACER</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<TaskManagerApp />);
