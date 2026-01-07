
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import DottedGlowBackground from './components/DottedGlowBackground';
import { SparklesIcon, ThinkingIcon } from './components/Icons';

// Icono de enlace para la UI
const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterPriority, setFilterPriority] = useState<Priority | 'Todas'>('Todas');
  const [filterStatus, setFilterStatus] = useState<'Todas' | 'Pendientes' | 'Completadas'>('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; visible: boolean; onUndo?: () => void } | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState<Priority>('Media');
  const [formDate, setFormDate] = useState('');

  // Persistencia
  useEffect(() => {
    const saved = localStorage.getItem('android_tasks_final_v2');
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        console.error("Error cargando tareas", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('android_tasks_final_v2', JSON.stringify(tasks));
  }, [tasks]);

  const showToast = (message: string, onUndo?: () => void) => {
    if (undoTimeoutRef.current) window.clearTimeout(undoTimeoutRef.current);
    setSnackbar({ message, visible: true, onUndo });
    undoTimeoutRef.current = window.setTimeout(() => setSnackbar(null), 5000);
  };

  const copyAppLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      showToast("Enlace copiado para tu emulador.");
    });
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
      showToast("Tarea actualizada");
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
      setTasks(prev => [...prev, taskToDelete].sort((a,b) => b.createdAt - a.createdAt));
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

  // Filtrado optimizado
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const pMatch = filterPriority === 'Todas' || t.priority === filterPriority;
      const sMatch = filterStatus === 'Todas' || (filterStatus === 'Completadas' ? t.completed : !t.completed);
      return pMatch && sMatch;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [tasks, filterPriority, filterStatus]);

  // Contadores para los chips
  const getCount = (priority: Priority | 'Todas') => {
    if (priority === 'Todas') return tasks.length;
    return tasks.filter(t => t.priority === priority).length;
  };

  const prioritiesList: (Priority | 'Todas')[] = ['Todas', 'Alta', 'Media', 'Baja'];

  return (
    <div className="app-shell android-theme">
      <DottedGlowBackground opacity={0.1} />
      
      <nav className="top-nav">
        <div className="nav-container">
          <div className="logo-section" onClick={() => { setFilterPriority('Todas'); setFilterStatus('Todas'); }}>
            <span className="logo-dot pulse"></span>
            <h1>TaskMaster Pro</h1>
          </div>
          <div className="nav-actions">
            <button className="icon-btn ripple" onClick={copyAppLink} title="Copiar link">
              <LinkIcon />
            </button>
            <select 
              className="android-select"
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="Todas">Todos</option>
              <option value="Pendientes">Pendientes</option>
              <option value="Completadas">Hechas</option>
            </select>
          </div>
        </div>
      </nav>

      {/* Botones principales de filtrado de prioridad */}
      <header className="filter-bar">
        <div className="chip-container no-scrollbar">
          {prioritiesList.map(p => {
            const count = getCount(p);
            const isActive = filterPriority === p;
            return (
              <button 
                key={p}
                className={`chip ${isActive ? 'active' : ''} ${p !== 'Todas' ? 'p-' + p.toLowerCase() : ''}`} 
                onClick={() => setFilterPriority(p)}
                aria-pressed={isActive}
              >
                <span className="chip-label">{p}</span>
                {count > 0 && <span className="chip-badge">{count}</span>}
              </button>
            );
          })}
        </div>
      </header>

      <main className="content-area">
        {filteredTasks.length === 0 ? (
          <div className="empty-state animate-fade-in">
            <div className="empty-icon"><ThinkingIcon /></div>
            <h2>{filterPriority === 'Todas' ? 'Sin tareas' : `No hay tareas ${filterPriority}`}</h2>
            <p>
              {filterPriority === 'Todas' 
                ? 'Pulsa el botón + para empezar el día.' 
                : `No tienes ninguna tarea marcada como prioridad ${filterPriority} en este momento.`}
            </p>
            {filterPriority !== 'Todas' && (
              <button className="text-btn" onClick={() => setFilterPriority('Todas')}>Ver todas las tareas</button>
            )}
          </div>
        ) : (
          <div className="task-list">
            <div className="list-header">
              <span className="list-title">
                {filterPriority === 'Todas' ? 'Todas las tareas' : `Tareas ${filterPriority}`}
              </span>
              <span className="list-count">{filteredTasks.length} {filteredTasks.length === 1 ? 'tarea' : 'tareas'}</span>
            </div>
            {filteredTasks.map(task => (
              <div 
                key={task.id} 
                className={`task-item animate-slide-in ${task.completed ? 'is-completed' : ''} priority-${task.priority.toLowerCase()}`}
              >
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
                <button className="delete-action-btn ripple" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}>
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <button className="fab ripple" onClick={() => openModal()} aria-label="Añadir tarea">
        <span className="fab-plus">+</span>
      </button>

      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-drag-handle"></div>
            <div className="modal-header">
              <h2>{editingTask ? 'Editar tarea' : 'Nueva tarea'}</h2>
              <button className="close-sheet ripple" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSaveTask}>
              <div className="input-group">
                <input 
                  autoFocus
                  className="main-input"
                  value={formTitle} 
                  onChange={e => setFormTitle(e.target.value)} 
                  placeholder="¿Qué hay que hacer?"
                  required
                />
              </div>
              <div className="input-group">
                <textarea 
                  className="desc-input"
                  value={formDesc} 
                  onChange={e => setFormDesc(e.target.value)} 
                  placeholder="Detalles (opcional)..."
                  rows={2}
                />
              </div>
              
              <div className="input-group">
                <label className="section-label">Prioridad de la tarea</label>
                <div className="priority-selector-grid">
                  {(['Baja', 'Media', 'Alta'] as Priority[]).map(p => (
                    <button 
                      key={p}
                      type="button"
                      className={`p-selector-btn ${p.toLowerCase()} ${formPriority === p ? 'is-selected' : ''}`}
                      onClick={() => setFormPriority(p)}
                    >
                      <div className="dot"></div>
                      <span>{p}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="section-label">Fecha Límite</label>
                <input 
                  type="datetime-local" 
                  className="date-input"
                  value={formDate} 
                  onChange={e => setFormDate(e.target.value)} 
                />
              </div>

              <div className="modal-footer">
                <button type="submit" className="submit-btn-android ripple">
                  {editingTask ? 'Guardar Cambios' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {snackbar && (
        <div className={`android-toast ${snackbar.visible ? 'show' : ''}`}>
          <div className="toast-body">
            <span className="toast-msg">{snackbar.message}</span>
            {snackbar.onUndo && (
              <button className="undo-action ripple" onClick={() => {
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
