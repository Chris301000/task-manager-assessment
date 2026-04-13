import { 
  DndContext, 
  closestCenter, 
  DragOverlay, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { DroppableColumn } from './DroppableColumn';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Plus, X, Loader2 } from 'lucide-react'; 

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-400' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'in_review', title: 'In Review', color: 'bg-amber-500' }, 
  { id: 'done', title: 'Done', color: 'bg-emerald-500' }
];

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState(''); // Search State

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchTasks = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('Tasks').select('*');
    if (error) console.error('Error fetching:', error);
    else setTasks(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      // 1. Check if we already have a saved guest session
      const { data: { session } } = await supabase.auth.getSession();
      
      // 2. Only create a new anonymous account if we AREN'T already logged in
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) console.error("Login failed:", error.message);
      }
      
      // 3. Now fetch the tasks using our persistent ID
      fetchTasks();
    };
    
    init();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('Tasks')
      .insert([{ 
        title: newTaskTitle, 
        status: 'todo',
        user_id: user?.id 
      }]);

    if (error) {
      console.error("Create failed:", error.message);
    } else {
      setNewTaskTitle('');
      setIsModalOpen(false);
      fetchTasks();
    }
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    setActiveTask(task);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveTask(null); 
    
    if (!over) return;

    const taskId = active.id;
    let newStatus = over.id; 

    let isOverColumn = COLUMNS.some(col => col.id === newStatus);

    if (!isOverColumn) {
      const taskDroppedOn = tasks.find(t => t.id === newStatus);
      if (taskDroppedOn) {
        newStatus = taskDroppedOn.status; 
      } else {
        return; 
      }
    }

    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (taskToUpdate?.status === newStatus) return; 

    // Optimistic UI Update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    // Database Update with Safety Net
    const { data, error } = await supabase
      .from('Tasks')
      .update({ status: newStatus })
      .eq('id', taskId)
      .select(); 

    if (error || !data || data.length === 0) {
      console.error("Save blocked by database security. Reverting UI.");
      fetchTasks(); 
    }
  };

  // --- STATS CALCULATIONS ---
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const completionPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      
      {/* HEADER WITH SEARCH BAR */}
      <header className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Board</h1>
          <p className="text-sm text-slate-500">Manage your guest tasks</p>
        </div>
        
        <div className="flex items-center gap-4">
          <input 
            type="text" 
            placeholder="Search tasks..." 
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm whitespace-nowrap"
          >
            <Plus size={18} />
            Add Task
          </button>
        </div>
      </header>

      {/* STATS BAR */}
      <div className="px-6 py-3 bg-white border-b border-slate-200 flex gap-6 text-sm">
        <span className="text-slate-500">Total Tasks: <strong className="text-slate-800">{totalTasks}</strong></span>
        <span className="text-slate-500">Completed: <strong className="text-emerald-600">{completedTasks}</strong></span>
        <span className="text-slate-500">Progress: <strong className="text-indigo-600">{completionPercentage}%</strong></span>
      </div>

      {/* MAIN KANBAN BOARD */}
      <main className="p-6 h-[calc(100vh-140px)] overflow-x-auto">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
          </div>
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter} 
            onDragStart={handleDragStart} 
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-6 h-full min-w-max">
              {COLUMNS.map((column) => {
                // Filter tasks for this column AND search query
                const columnTasks = tasks.filter(task => 
                  task.status === column.id && 
                  task.title.toLowerCase().includes(searchQuery.toLowerCase())
                );

                return (
                  <div key={column.id} className="w-80 flex flex-col gap-4">
                    
                    {/* COLORED HEADER & COUNTER */}
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
                        <h2 className="font-semibold text-slate-700 uppercase text-sm tracking-wider">
                          {column.title}
                        </h2>
                      </div>
                      <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                        {columnTasks.length}
                      </span>
                    </div>
                    
                    {/* DROPPABLE AREA */}
                    <DroppableColumn id={column.id}>
                      <div className="flex flex-col gap-3 min-h-[100px] h-full">
                        <SortableContext 
                          items={columnTasks.map(t => t.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {columnTasks.map((task) => (
                            <TaskCard key={task.id} task={task} />
                          ))}
                          
                          {/* EMPTY STATE */}
                          {columnTasks.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-8 italic">
                              {searchQuery ? "No matching tasks" : "No tasks yet"}
                            </p>
                          )}
                        </SortableContext>
                      </div>
                    </DroppableColumn>
                  </div>
                );
              })}
            </div>

            {/* DRAG OVERLAY (Fixed Double Transform) */}
            <DragOverlay>
              {activeTask ? (
                <div className="opacity-80 scale-105 rotate-2 cursor-grabbing">
                  <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-l-indigo-500 border-y border-r border-slate-200">
                    <p className="text-slate-800 font-medium">{activeTask.title}</p>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {/* TASK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Create New Task</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTask}>
              <input 
                autoFocus
                type="text" 
                placeholder="What needs to be done?"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}