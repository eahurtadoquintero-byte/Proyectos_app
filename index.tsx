
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import DottedGlowBackground from './components/DottedGlowBackground';
import { SparklesIcon, ThinkingIcon } from './components/Icons';

const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14"></line>
    <line x1="4" y1="10" x2="4" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12" y2="3"></line>
    <line x1="20" y1="21" x2="20" y2="16"></line>
    <line x1="20" y1="12" x2="20" y2="3"></line>
    <line x1="1" y1="14" x2="7" y2="14"></line>
    <line x1="9" y1="8" x2="15" y2="8"></line>
    <line x1="17" y1="16" x2="23" y2="16"></line>
  </svg>
);

type Priority = 'Alta' | 'Media' | 'Baja';
type StatusFilter = 'Todas' | 'Pendientes' | 'Completadas';

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
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; visible: boolean; onUndo?: () => void } | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState<Priority>('Media');
  const [formDate, setFormDate] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('android_tasks_final_v4');
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        console.error("Error cargando tareas", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('android_tasks_final_v4', JSON.stringify(tasks));
  }, [tasks]);

  const showToast = (message: string, onUndo?: () => void) => {
    if (undoTimeoutRef.current) window.clearTimeout(undoTimeoutRef.current);
    setSnackbar({ message, visible: true, onUndo });
    undoTimeoutRef.current = window.setTimeout(() => setSnackbar(null), 4000);
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

  const resetFilters = () => {
    setFilterPriority('Todas');
    setFilterStatus('Todas');
    showToast("Filtros restablecidos");
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const pMatch = filterPriority === 'Todas' || t.priority === filterPriority;
      const sMatch = filterStatus === 'Todas' || (filterStatus === 'Completadas' ? t.completed : !t.completed);
      return pMatch && sMatch;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [tasks, filterPriority, filterStatus]);

  const counts = useMemo(() => {
    return {
      Todas: tasks.length,
      Alta: tasks.filter(t => t.priority === 'Alta').length,
      Media: tasks.filter(t => t.priority === 'Media').length,
      Baja: tasks.filter(t => t.priority === 'Baja').length,
    };
  }, [tasks]);

  return (
    <div className="app-shell android-theme">
      {/* Fondo con pointer-events: none para no bloquear clics */}
      <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, zIndex: -1 }}>
        <DottedGlowBackground opacity={0.05} />
      </div>
      
      <nav className="top-nav">
        <div className="nav-container">
          <div className="logo-section" onClick={() => resetFilters()}>
            <span className="logo-dot pulse"></span>
            <h1>TaskMaster</h1>
          </div>
          <div className="nav-actions">
            <button className="icon-btn ripple" onClick={(e) => { e.stopPropagation(); copyAppLink(); }} title="Copiar link">
              <LinkIcon />
            </button>
            <div className="status-tab-group">
              {(['Todas', 'Pendientes', 'Completadas'] as StatusFilter[]).map(s => (
                <button 
                  key={s} 
                  className={`status-tab ${filterStatus === s ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setFilterStatus(s); }}
                >
                  {s.charAt(0)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <header className="filter-bar">
        <div className="filter-scroll-container no-scrollbar">
          <div className="filter-label"><FilterIcon /> Prioridad:</div>
          {(['Todas', 'Alta', 'Media', 'Baja'] as const).map(p => {
            const count = counts[p];
            const isActive = filterPriority === p;
            return (
              <button 
                key={p}
                className={`priority-chip ${isActive ? 'active' : ''} ${p !== 'Todas' ? 'p-' + p.toLowerCase() : ''}`} 
                onClick={(e) => { e.stopPropagation(); setFilterPriority(p); }}
              >
                <span className="chip-text">{p}</span>
                {count > 0 && <span className="chip-count-bubble">{count}</span>}
              </button>
            );
          })}
        </div>
      </header>

      <main className="content-area">
        <div className="context-indicator">
          <span>Ver: <strong>{filterStatus}</strong> | <strong>{filterPriority}</strong></span>
          {(filterStatus !== 'Todas' || filterPriority !== 'Todas') && (
            <button className="clear-link" onClick={(e) => { e.stopPropagation(); resetFilters(); }}>Limpiar</button>
          )}
        </div>

        {filteredTasks.length === 0 ? (
          <div className="empty-state animate-fade-in">
            <div className="empty-icon"><ThinkingIcon /></div>
            <h2>Nada que mostrar</h2>
            <p>Ajusta los filtros o crea una nueva tarea para empezar.</p>
            <button className="primary-outline-btn ripple" onClick={() => openModal()}>Nueva Tarea</button>
          </div>
        ) : (
          <div className="task-list">
            {filteredTasks.map(task => (
              <div 
                key={task.id} 
                className={`task-card animate-slide-up ${task.completed ? 'completed' : ''} priority-${task.priority.toLowerCase()}`}
              >
                <div className="card-check-zone" onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}>
                  <div className={`custom-checkbox ${task.completed ? 'is-checked' : ''}`}>
                    {task.completed && <span className="check-mark">✓</span>}
                  </div>
                </div>
                
                <div className="card-content-zone" onClick={() => openModal(task)}>
                  <div className="card-header-row">
                    <h3>{task.title}</h3>
                    <span className={`tag-priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
                  </div>
                  {task.description && <p className="card-description">{task.description}</p>}
                  {task.dueDate && (
                    <div className="card-footer-meta">
                      <span className="meta-icon">⏰</span>
                      <span className="meta-text">{new Date(task.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                  )}
                </div>

                <div className="card-action-zone">
                   <button className="action-btn-del ripple" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}>
                     &times;
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <button className="fab-android ripple" onClick={() => openModal()} aria-label="Nueva tarea">
        <span className="plus-sign">+</span>
      </button>

      {isModalOpen && (
        <div className="sheet-backdrop" onClick={closeModal}>
          <div className="sheet-container" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <div className="sheet-header">
              <h2>{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
              <button className="sheet-close-btn ripple" onClick={closeModal}>&times;</button>
            </div>
            
            <form onSubmit={handleSaveTask} className="sheet-form">
              <div className="form-group">
                <input 
                  autoFocus
                  className="input-underlined"
                  value={formTitle} 
                  onChange={e => setFormTitle(e.target.value)} 
                  placeholder="¿Qué tienes pendiente?"
                  required
                />
              </div>

              <div className="form-group">
                <textarea 
                  className="input-boxed"
                  value={formDesc} 
                  onChange={e => setFormDesc(e.target.value)} 
                  placeholder="Detalles adicionales..."
                  rows={2}
                />
              </div>
              
              <div className="form-group">
                <label className="label-material">Nivel de Prioridad</label>
                <div className="priority-grid-selector">
                  {(['Baja', 'Media', 'Alta'] as Priority[]).map(p => (
                    <button 
                      key={p}
                      type="button"
                      className={`priority-option-btn ${p.toLowerCase()} ${formPriority === p ? 'selected' : ''}`}
                      onClick={() => setFormPriority(p)}
                    >
                      <span className="dot"></span>
                      <span className="text">{p}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="label-material">Fecha / Hora</label>
                <input 
                  type="datetime-local" 
                  className="input-date-material"
                  value={formDate} 
                  onChange={e => setFormDate(e.target.value)} 
                />
              </div>

              <div className="sheet-actions">
                <button type="submit" className="btn-primary-full ripple">
                  {editingTask ? 'Guardar Cambios' : 'Confirmar Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {snackbar && (
        <div className={`material-toast ${snackbar.visible ? 'visible' : ''}`}>
          <div className="toast-inner">
            <span className="toast-text">{snackbar.message}</span>
            {snackbar.onUndo && (
              <button className="undo-btn ripple" onClick={() => {
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
