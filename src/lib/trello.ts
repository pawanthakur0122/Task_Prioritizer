import { supabase } from './supabase';
import { analyzePriority } from './deepseek';
import { parseISO } from 'date-fns';

const TRELLO_API_KEY = '0b53aff05f0b6059ba7686b2e6c904e2';
const TRELLO_TOKEN = '5641a071045c47784b076218a5047f992fa8e5c1215b32189637c1d1ac554e79';

export async function importTrelloTasks() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Please sign in to import tasks');
    }

    // First verify the token is valid
    const authCheckResponse = await fetch(
      `https://api.trello.com/1/members/me?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`
    );

    if (!authCheckResponse.ok) {
      if (authCheckResponse.status === 401) {
        throw new Error('Invalid Trello credentials. Please check your API key and token.');
      }
      throw new Error(`Trello authentication failed: ${authCheckResponse.statusText}`);
    }

    // Fetch cards with detailed information
    const response = await fetch(
      `https://api.trello.com/1/members/me/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}&fields=name,desc,due,dueComplete,labels,checklists`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Trello cards: ${response.statusText}`);
    }

    const cards = await response.json();
    
    if (!Array.isArray(cards)) {
      throw new Error('Invalid response from Trello API');
    }

    if (cards.length === 0) {
      return 0;
    }

    // Process cards in batches to avoid overwhelming the system
    const BATCH_SIZE = 10;
    const tasks = [];
    
    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
      const batch = cards.slice(i, i + BATCH_SIZE);
      const batchTasks = await Promise.all(batch.map(async (card) => {
        try {
          // Determine effort based on card complexity
          let effort = 'MEDIUM';
          
          // Check labels for effort indicators
          if (card.labels?.length > 0) {
            const effortLabel = card.labels.find(l => 
              l.name.toUpperCase().includes('EFFORT:') ||
              ['EASY', 'MEDIUM', 'HARD', 'SHORT', 'LONG'].includes(l.name.toUpperCase())
            );
            
            if (effortLabel) {
              const labelName = effortLabel.name.toUpperCase();
              if (labelName.includes('EASY') || labelName.includes('SHORT')) effort = 'SHORT';
              else if (labelName.includes('HARD') || labelName.includes('LONG')) effort = 'LONG';
            }
          }

          // Check checklists for complexity
          if (card.checklists?.length > 2) {
            effort = 'LONG';
          }

          const dueDate = card.due ? parseISO(card.due) : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to tomorrow

          const priority = await analyzePriority({
            name: card.name,
            description: card.desc,
            due_date: dueDate,
            effort: effort,
            status: card.dueComplete ? 'COMPLETED' : 'PENDING'
          });

          return {
            name: card.name || 'Untitled Task',
            description: card.desc || '',
            due_date: dueDate.toISOString(),
            effort: effort,
            priority: priority.priority,
            priority_score: priority.score,
            status: card.dueComplete ? 'COMPLETED' : 'PENDING',
            user_id: user.id
          };
        } catch (error) {
          console.error('Error processing Trello card:', error);
          return null;
        }
      }));

      tasks.push(...batchTasks.filter(task => task !== null));
    }

    if (tasks.length === 0) {
      throw new Error('No valid tasks found in Trello board');
    }

    // Insert tasks in batches
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = tasks.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('tasks').insert(batch);
      if (error) throw error;
    }

    return tasks.length;
  } catch (error) {
    console.error('Error importing Trello tasks:', error);
    throw new Error(error.message || 'Failed to import tasks from Trello');
  }
}