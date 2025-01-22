import React, { useState } from 'react';
import { Calendar, Clock, Trello } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { analyzePriority } from '../lib/deepseek';
import { importTrelloTasks } from '../lib/trello';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

export function TaskForm() {
  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState({
    name: '',
    due_date: new Date(),
    effort: 'MEDIUM',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign in to create tasks');
        return;
      }

      const priority = await analyzePriority({
        ...task,
        due_date: task.due_date,
      });

      if (!priority) {
        throw new Error('Failed to analyze task priority');
      }

      const { error } = await supabase.from('tasks').insert([{
        name: task.name,
        description: task.description,
        due_date: task.due_date.toISOString(),
        effort: task.effort,
        priority: priority.priority,
        priority_score: priority.score,
        status: 'PENDING',
        user_id: user.id
      }]);

      if (error) throw error;

      toast.success('Task created successfully!');
      setTask({ name: '', due_date: new Date(), effort: 'MEDIUM', description: '' });
    } catch (error) {
      toast.error(error.message || 'Failed to create task');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrelloImport = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to import tasks');
        return;
      }
      const tasksImported = await importTrelloTasks();
      if (tasksImported === 0) {
        toast.error('No tasks found to import from Trello');
      } else {
        toast.success(`Successfully imported ${tasksImported} tasks from Trello`);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to import Trello tasks. Please check your Trello connection.');
      console.error('Error importing Trello tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 dark:bg-gray-800 bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleTrelloImport}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
        >
          <Trello className="h-5 w-5 mr-2" />
          Import from Trello
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium dark:text-gray-200 text-gray-700 mb-2">
          Task Name
        </label>
        <input
          type="text"
          required
          value={task.name}
          onChange={(e) => setTask({ ...task, name: e.target.value })}
          className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
          placeholder="Enter task name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium dark:text-gray-200 text-gray-700 mb-2">
          Due Date
        </label>
        <div className="relative">
          <DatePicker
            selected={task.due_date}
            onChange={(date) => setTask({ ...task, due_date: date })}
            className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            dateFormat="MMMM d, yyyy"
            minDate={new Date()}
            placeholderText="Select due date"
          />
          <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium dark:text-gray-200 text-gray-700 mb-2">
          Effort Estimate
        </label>
        <div className="relative">
          <select
            value={task.effort}
            onChange={(e) => setTask({ ...task, effort: e.target.value })}
            className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
          >
            <option value="SHORT">Short (less than 2 hours)</option>
            <option value="MEDIUM">Medium (2-4 hours)</option>
            <option value="LONG">Long (more than 4 hours)</option>
          </select>
          <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium dark:text-gray-200 text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={task.description}
          onChange={(e) => setTask({ ...task, description: e.target.value })}
          className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
          rows={3}
          placeholder="Enter task description"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
      >
        {loading ? 'Analyzing...' : 'Create Task'}
      </button>
    </form>
  );
}