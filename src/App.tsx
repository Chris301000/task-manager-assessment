import './App.css'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

// Define the required columns [cite: 554]
const COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'in_review', title: 'In Review' },
  { id: 'done', title: 'Done' }
]

export default function App() {
  useEffect(() => {
    // Automatically trigger guest session on launch [cite: 573]
    const initGuest = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) await supabase.auth.signInAnonymously()
    }
    initGuest()
  }, [])

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Header Area */}
      <header className="p-6 border-b border-slate-200 bg-white">
        <h1 className="text-2xl font-bold tracking-tight">Project Board</h1>
      </header>

      {/* Kanban Board [cite: 554] */}
      <main className="p-6 h-[calc(100vh-88px)] overflow-x-auto">
        <div className="flex gap-6 h-full min-w-max">
          {COLUMNS.map((column) => (
            <div key={column.id} className="w-80 flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="font-semibold text-slate-600 uppercase text-sm tracking-wider">
                  {column.title}
                </h2>
                <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                  0
                </span>
              </div>
              
              {/* Column Content Area */}
              <div className="flex-1 bg-slate-100/50 rounded-xl border-2 border-dashed border-slate-200 p-2">
                {/* Tasks will go here */}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}