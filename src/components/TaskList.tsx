import React, { useEffect, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

type Task = {
  id: string;
  name: string;
  due_date: string;
  effort: string;
  priority: string;
  status: string;
  description?: string;
};

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setTasks([]);
        return;
      }

      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });
      
      if (filter !== 'ALL') {
        query = query.eq('priority', filter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Validate dates before setting tasks
      const validTasks = (data || []).filter(task => {
        try {
          parseISO(task.due_date);
          return true;
        } catch (e) {
          console.error(`Invalid date for task ${task.id}:`, task.due_date);
          return false;
        }
      });
      
      setTasks(validTasks);
    } catch (error) {
      toast.error('Failed to fetch tasks');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    
    const subscription = supabase
      .channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [filter]);

  const completeTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'COMPLETED' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Task completed!');
      await fetchTasks();
    } catch (error) {
      toast.error('Failed to complete task');
      console.error('Error:', error);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Task deleted');
      await fetchTasks();
    } catch (error) {
      toast.error('Failed to delete task');
      console.error('Error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (e) {
      console.error('Invalid date:', dateString);
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption)}
            className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
              filter === filterOption
                ? 'bg-blue-600 text-white'
                : 'dark:bg-gray-700 dark:text-gray-200 bg-gray-200 text-gray-700'
            }`}
          >
            {filterOption === 'ALL' ? 'All Tasks' : `${filterOption} Priority`}
          </button>
        ))}
      </div>

      <div className="dark:bg-gray-800 bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-4 text-center dark:text-gray-200">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-4 text-center dark:text-gray-200">No tasks found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y dark:divide-gray-700 divide-gray-200">
              <thead className="dark:bg-gray-700 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium dark:text-gray-200 text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium dark:text-gray-200 text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium dark:text-gray-200 text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium dark:text-gray-200 text-gray-500 uppercase tracking-wider">
                    Effort
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium dark:text-gray-200 text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium dark:text-gray-200 text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700 divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.id} className="dark:hover:bg-gray-700 hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="text-sm dark:text-white text-gray-900 font-medium">{task.name}</div>
                      {task.description && (
                        <div className="text-sm dark:text-gray-300 text-gray-500">{task.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm dark:text-gray-200 text-gray-900">
                        {formatDate(task.due_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          task.priority === 'HIGH'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : task.priority === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-200 text-gray-500">
                      {task.effort}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          task.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => completeTask(task.id)}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                        >
                          <Check size={20} />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}