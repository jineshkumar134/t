
import React, { useState, useEffect, useCallback } from 'react';
import { Task, AISuggestion } from './types';
import TaskItem from './components/TaskItem';
import { categorizeTask, getSmartSuggestions } from './services/geminiService';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('nova_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [inputValue, setInputValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    localStorage.setItem('nova_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    setIsAdding(true);
    const text = inputValue;
    setInputValue('');

    // Optimistic add
    const tempId = Date.now().toString();
    const newTask: Task = {
      id: tempId,
      text,
      completed: false,
      createdAt: Date.now(),
      category: 'Pending...',
      priority: 'medium'
    };

    setTasks(prev => [newTask, ...prev]);

    // AI Enrichment
    try {
      const enrichment = await categorizeTask(text);
      setTasks(prev => prev.map(t => 
        t.id === tempId ? { ...t, category: enrichment.category, priority: enrichment.priority as any } : t
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const fetchSuggestions = async () => {
    setIsThinking(true);
    try {
      const result = await getSmartSuggestions(tasks);
      setSuggestions(result.suggestions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsThinking(false);
    }
  };

  const addFromSuggestion = (suggestionText: string) => {
    setInputValue(suggestionText);
    setSuggestions(prev => prev.filter(s => s.task !== suggestionText));
    // Focus or trigger add? Let's just set the input for the user to review
  };

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">NovaTask <span className="text-indigo-600">AI</span></h1>
          </div>
          <div className="text-sm font-medium text-slate-500">
            {completedCount}/{tasks.length} Completed
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-8">
        {/* Input Section */}
        <section className="mb-10">
          <form onSubmit={addTask} className="relative group">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full h-14 pl-5 pr-16 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isAdding}
              className="absolute right-2 top-2 h-10 w-12 flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm"
            >
              {isAdding ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
          </form>
          <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5 ml-2">
            <svg className="w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.95a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zM6.464 14.95a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0z" />
            </svg>
            AI will automatically categorize and prioritize your tasks
          </p>
        </section>

        {/* AI Suggestions Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Smart Suggestions</h2>
            <button 
              onClick={fetchSuggestions}
              disabled={isThinking}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:text-slate-400 flex items-center gap-1"
            >
              <svg className={`w-3 h-3 ${isThinking ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Brainstorm
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {suggestions.length > 0 ? (
              suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => addFromSuggestion(s.task)}
                  className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-left hover:bg-indigo-100 transition-colors group"
                >
                  <p className="text-sm font-semibold text-indigo-900 group-hover:text-indigo-950 mb-1">{s.task}</p>
                  <p className="text-[10px] text-indigo-500 line-clamp-2">{s.reason}</p>
                </button>
              ))
            ) : (
              <div className="col-span-3 py-6 px-4 bg-slate-100 border border-dashed border-slate-300 rounded-xl text-center">
                <p className="text-sm text-slate-500">Tap refresh to get AI-powered ideas based on your list</p>
              </div>
            )}
          </div>
        </section>

        {/* Task List */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Your Tasks</h2>
          {tasks.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <p className="text-slate-500 font-medium">All caught up! Time for a break.</p>
              <p className="text-sm text-slate-400 mt-1">Add a task above to get started.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {tasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onDelete={deleteTask} 
                  onToggle={toggleTask} 
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Floating Action Hint for Mobile */}
      {inputValue && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 md:hidden">
          <span className="text-sm font-bold">Press enter to add</span>
        </div>
      )}
    </div>
  );
};

export default App;
