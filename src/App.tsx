import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard'; // Make sure this path is correct!
import { DroppableColumn } from './DroppableColumn';

import { useEffect, useState } from 'react' // Added 'useState' here
import { supabase } from './lib/supabase'   // You need this to talk to your DB
import { Plus, X } from 'lucide-react'       // Make sure these match the icons you use

const COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'in_review', title: 'In Review' },
  { id: 'done', title: 'Done' }
]

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [tasks, setTasks] = useState<any[]>([]);
  
  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('Tasks')
      .select('*');
    
    if (error) console.error('Error fetching:', error);
    else setTasks(data || []);
  };

  useEffect(() => {
    const init = async () => {
      // Wait for login first so RLS knows who we are
      await supabase.auth.signInAnonymously();
      // Then get the tasks
      fetchTasks();
    };
    
    init();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const { error } = await supabase
      .from('Tasks')
      .insert([{ title: newTaskTitle, status: 'todo' }])

    if (error) {
      console.error(error)
    } else {
      setNewTaskTitle('')
      setIsModalOpen(false)
      fetchTasks();
    }
  }
  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    // Ensure we only use the ID if it's one of our valid column names
    const newStatus = over.id; 
    const isValidColumn = COLUMNS.some(col => col.id === newStatus);

    if (!isValidColumn) return; // This prevents tasks from "vanishing" if dropped on other cards

    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (taskToUpdate?.status === newStatus) return;

    // 1. Update UI
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    // 2. Update Supabase
    const { error } = await supabase
      .from('Tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
      console.error("Save failed:", error.message);
      fetchTasks(); 
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Header Area */}
      <header className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Board</h1>
          <p className="text-sm text-slate-500">Manage your guest tasks</p>
        </div>
        
        {/* BIG BUTTON */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm"
        >
          <Plus size={18} />
          Add Task
        </button>
      </header>

      {/* Kanban Board */}
      <main className="p-6 h-[calc(100vh-88px)] overflow-x-auto">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-6 h-full min-w-max">
            {COLUMNS.map((column) => (
              <div key={column.id} className="w-80 flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <h2 className="font-semibold text-slate-600 uppercase text-sm tracking-wider">
                    {column.title}
                  </h2>
                </div>
                
                {/* INSERT DROPPABLE HERE: Replacing the old static div */}
                <DroppableColumn id={column.id}>
                  <div className="flex flex-col gap-3">
                    <SortableContext 
                      items={tasks.filter(t => t.status === column.id).map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {tasks
                        .filter((task) => task.status === column.id)
                        .map((task) => (
                          <TaskCard key={task.id} task={task} />
                        ))}
                    </SortableContext>
                  </div>
                </DroppableColumn>

              </div>
            ))}
          </div>
        </DndContext>
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
  )
}