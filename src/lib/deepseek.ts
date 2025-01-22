import { differenceInDays } from 'date-fns';

type TaskInput = {
  name: string;
  due_date: Date;
  effort: string;
  description?: string;
  status?: string;
};

export async function analyzePriority(task: TaskInput) {
  try {
    // If task is completed, return LOW priority
    if (task.status === 'COMPLETED') {
      return {
        priority: 'LOW',
        score: 1
      };
    }

    // Calculate days until deadline
    const daysUntilDeadline = differenceInDays(task.due_date, new Date());
    
    // Determine deadline priority
    let deadlinePriority = 'LOW';
    if (daysUntilDeadline <= 1) {
      deadlinePriority = 'HIGH';
    } else if (daysUntilDeadline <= 3) {
      deadlinePriority = 'MEDIUM';
    }

    // Convert effort to priority level
    const effortPriority = task.effort === 'LONG' ? 'HIGH' : 
                          task.effort === 'MEDIUM' ? 'MEDIUM' : 'LOW';

    // Calculate priority score (1-10)
    let priorityScore = 1;

    // Add points based on deadline
    if (deadlinePriority === 'HIGH') priorityScore += 4;
    else if (deadlinePriority === 'MEDIUM') priorityScore += 2;

    // Add points based on effort
    if (effortPriority === 'HIGH') priorityScore += 3;
    else if (effortPriority === 'MEDIUM') priorityScore += 2;

    // Determine final priority
    let finalPriority = 'LOW';
    
    // If any criterion is HIGH, make it HIGH priority
    if (deadlinePriority === 'HIGH' || effortPriority === 'HIGH') {
      finalPriority = 'HIGH';
      priorityScore = Math.min(10, priorityScore + 3);
    }
    // If multiple criteria are MEDIUM, make it HIGH priority
    else if (deadlinePriority === 'MEDIUM' && effortPriority === 'MEDIUM') {
      finalPriority = 'HIGH';
      priorityScore = Math.min(10, priorityScore + 2);
    }
    // If any criterion is MEDIUM, make it MEDIUM priority
    else if (deadlinePriority === 'MEDIUM' || effortPriority === 'MEDIUM') {
      finalPriority = 'MEDIUM';
      priorityScore = Math.min(10, priorityScore + 1);
    }

    return {
      priority: finalPriority,
      score: priorityScore
    };
  } catch (error) {
    console.error('Error analyzing priority:', error);
    // Return a safe default
    return {
      priority: 'MEDIUM',
      score: 5
    };
  }
}