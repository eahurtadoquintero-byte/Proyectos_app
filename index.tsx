
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import DottedGlowBackground from './components/DottedGlowBackground';
import { ThinkingIcon } from './components/Icons';

// Registro de Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(registration => {
      console.log('SW registrado con éxito:', registration.scope);
    }, err => {
      console.log('Fallo al registrar SW:', err);
    });
  });
}

type Priority = 'Alta' | 'Media' | 'Baja';

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  reminderMinutes: number; 
  completed: boolean;
  createdAt: number;
  notified?: boolean;
}

const PRIORITY_VALUE = { 'Alta': 3, 'Media': 2, 'Baja': 1 };

const AppLogo = ({ size = 120 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="app-logo-svg">
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6750A4" />
        <stop offset="100%" stopColor="#00BCD4" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <circle cx="50" cy="50" r="42" stroke="url(#logoGrad)" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
    <path d="M35 50L48 63L70 38" stroke="url(#logoGrad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" className="logo-path" />
    <rect x="25" y="25" width="50" height="50" rx="12" stroke="url(#logoGrad)" strokeWidth="2" opacity="0.2" />
  </svg>
);

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <AppLogo />
        <h1 className="splash-title">Task Master</h1>
        <p className="splash-tagline">Creatividad • Tecnología • Orden</p>
        <div className="splash-loader">
          <div className="loader-bar"></div>
        </div>
      </div>
    </div>
  );
};

const TaskManagerApp = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterPriority, setFilterPriority] = useState<Priority | 'Todas'>('Todas');
  const [filterStatus, setFilterStatus] = useState<'Todas' | 'Pendientes' | 'Completadas'>('Todas');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; visible: boolean; onUndo?: () => void } | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);
  const notifiedIds = useRef<Set<string>>(new Set());

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState<Priority>('Media');
  const [formDate, setFormDate] = useState('');
  const [formReminder, setFormReminder] = useState(15);

  useEffect(() => {
    const saved = localStorage.getItem('task_master_v2_final');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTasks(parsed);
      } catch (e) {
        console.error("Error cargando tareas", e);
      }
    }
    
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('task_master_v2_final', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    const checkNotifications = () => {
      const now = Date.now();
      tasks.forEach(task => {
        if (!task.completed && task.dueDate && !notifiedIds.current.has(task.id)) {
          const dueTime = new Date(task.dueDate).getTime();
          const notifyTime = dueTime - (task.reminderMinutes * 60000);
          
          if (now >= notifyTime && now < dueTime + 60000) {
            if (Notification.permission === "granted") {
              new Notification("Recordatorio: " + task.title, {
                body: `Vence pronto (${new Date(task.dueDate).toLocaleTimeString()}). Prioridad: ${task.priority}`,
                icon: 'https://cdn-icons-png.flaticon.com/512/906/906334.png'
              });
              notifiedIds.current.add(task.id);
            }
          }
        }
      });
    };

    const interval = setInterval(checkNotifications, 30000);
    return () => clearInterval(interval);
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
      reminderMinutes: formReminder,
    };

    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskData } : t));
      showToast("Tarea actualizada");
    } else {
      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        ...taskData,
        completed: false,
        createdAt: Date.now()
      };
      setTasks(prev => [newTask, ...prev]);
      showToast("Tarea creada con éxito");
    }
    closeModal();
  };

  const deleteTask = useCallback((id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    showToast("Tarea eliminada", () => {
      setTasks(prev => [...prev, taskToDelete]);
    });
  }, [tasks]);

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }, []);

  const openModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormTitle(task.title);
      setFormDesc(task.description);
      setFormPriority(task.priority);
      setFormDate(task.dueDate);
      setFormReminder(task.reminderMinutes || 15);
    } else {
      setEditingTask(null);
      setFormTitle('');
      setFormDesc('');
      setFormPriority('Media');
      setFormDate('');
      setFormReminder(15);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const processedTasks = useMemo(() => {
    return tasks
      .filter(t => {
        const pMatch = filterPriority === 'Todas' || t.priority === filterPriority;
        const sMatch = filterStatus === 'Todas' || (filterStatus === 'Completadas' ? t.completed : !t.completed);
        return pMatch && sMatch;
      })
      .sort((a, b) => {
        if (PRIORITY_VALUE[b.priority] !== PRIORITY_VALUE[a.priority]) {
          return PRIORITY_VALUE[b.priority] - PRIORITY_VALUE[a.priority];
        }
        return b.createdAt - a.createdAt;
      });
  }, [tasks, filterPriority, filterStatus]);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div className="app-shell android-native animate-fade-in">
      <DottedGlowBackground opacity={0.08} />
      
      <nav className="top-nav">
        <div className="nav-container">
          <div className="logo-section">
            <div className="mini-logo"><AppLogo size={24} /></div>
            <h1>Task Master</h1>
          </div>
          <div className="nav-filters">
            <select 
              className="native-select"
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="Todas">Todos los estados</option>
              <option value="Pendientes">Pendientes</option>
              <option value="Completadas">Completadas</option>
            </select>
          </div>
        </div>
      </nav>

      <div className="chip-bar">
        <div className="chip-scroll">
          {(['Todas', 'Alta', 'Media', 'Baja'] as const).map(p => (
            <button 
              key={p}
              className={`chip-v2 ${filterPriority === p ? 'active' : ''} ${p !== 'Todas' ? 'border-' + p.toLowerCase() : ''}`} 
              onClick={() => setFilterPriority(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <main className="main-feed">
        {processedTasks.length === 0 ? (
          <div className="empty-view">
            <ThinkingIcon />
            <p>{tasks.length === 0 ? "Empieza creando tu primera tarea" : "No hay tareas que coincidan con el filtro"}</p>
          </div>
        ) : (
          <div className="task-stack">
            {processedTasks.map(task => (
              <div key={task.id} className={`task-tile ${task.completed ? 'is-done' : ''} priority-border-${task.priority.toLowerCase()}`} onClick={() => openModal(task)}>
                <div className="tile-check" onClick={(e) => { 
                  e.stopPropagation(); 
                  toggleTask(task.id); 
                }}>
                  <div className={`native-checkbox ${task.completed ? 'checked' : ''}`}></div>
                </div>
                <div className="tile-content">
                  <div className="tile-title-row">
                    <h3>{task.title}</h3>
                    <span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span>
                  </div>
                  {task.description && <p className="tile-desc">{task.description}</p>}
                  {task.dueDate && (
                    <div className="tile-date">
                      📅 {new Date(task.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      {task.reminderMinutes > 0 && <span className="reminder-indicator"> 🔔 {task.reminderMinutes}m antes</span>}
                    </div>
                  )}
                </div>
                <button className="tile-delete" onClick={(e) => { 
                  e.stopPropagation(); 
                  deleteTask(task.id); 
                }} aria-label="Eliminar">
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <button className="fab-button ripple" onClick={() => openModal()} aria-label="Nueva tarea">
        <span>+</span>
      </button>

      {isModalOpen && (
        <div className="bottom-sheet-overlay" onClick={closeModal}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <div className="sheet-header">
              <h2>{editingTask ? 'Editar actividad' : 'Nueva actividad'}</h2>
              <p className="sheet-subtitle">Define prioridad y avisos para un mejor control.</p>
            </div>
            
            <form onSubmit={handleSaveTask}>
              <div className="sheet-body">
                <div className="input-field">
                  <label>Título de la tarea</label>
                  <input 
                    autoFocus
                    className="sheet-input-title"
                    value={formTitle} 
                    onChange={e => setFormTitle(e.target.value)} 
                    placeholder="Ej: Revisar informe mensual"
                    required
                  />
                </div>
                
                <div className="input-field">
                  <label>Descripción (opcional)</label>
                  <textarea 
                    className="sheet-input-desc"
                    value={formDesc} 
                    onChange={e => setFormDesc(e.target.value)} 
                    placeholder="Detalles importantes..."
                    rows={2}
                  />
                </div>

                <label className="sheet-label">Asignar Prioridad</label>
                <div className="priority-grid">
                  {(['Baja', 'Media', 'Alta'] as Priority[]).map(p => (
                    <div 
                      key={p}
                      className={`priority-item ${formPriority === p ? 'selected' : ''} p-${p.toLowerCase()}`}
                      onClick={() => setFormPriority(p)}
                    >
                      <div className={`item-indicator ${p.toLowerCase()}`}></div>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>

                <div className="row-fields">
                  <div className="input-field half">
                    <label className="sheet-label">Fecha Límite</label>
                    <input 
                      type="datetime-local" 
                      className="sheet-input-date"
                      value={formDate} 
                      onChange={e => setFormDate(e.target.value)} 
                    />
                  </div>
                  <div className="input-field half">
                    <label className="sheet-label">Avisar antes</label>
                    <select 
                      className="sheet-select-reminder"
                      value={formReminder}
                      onChange={e => setFormReminder(Number(e.target.value))}
                    >
                      <option value={0}>Sin aviso</option>
                      <option value={5}>5 min antes</option>
                      <option value={15}>15 min antes</option>
                      <option value={30}>30 min antes</option>
                      <option value={60}>1 hora antes</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="sheet-footer">
                <button type="submit" className="sheet-btn-primary">
                  {editingTask ? 'Guardar Cambios' : 'Confirmar Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {snackbar && (
        <div className={`native-snackbar ${snackbar.visible ? 'show' : ''}`}>
          <div className="snackbar-content">
            <span className="snackbar-text">{snackbar.message}</span>
            {snackbar.onUndo && (
              <button className="snackbar-action" onClick={() => {
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
