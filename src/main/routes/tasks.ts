import { Router } from 'express';
import axios from 'axios';

const router = Router();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api/tasks';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate?: string;
  createdDate: string;
  updatedDate: string;
}

interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate?: string;
}


function formatDateForBackend(dateString: string): string | undefined {
  if (!dateString) return undefined;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return undefined;
    
    
    return date.toISOString();
  } catch (error) {
    return undefined;
  }
}


router.get('/tasks', async (req, res) => {
  try {
    console.log('Fetching tasks from:', API_BASE_URL);
    const response = await axios.get<Task[]>(API_BASE_URL);
    const tasks = response.data;
    
    console.log('Fetched tasks:', tasks.length);
    
    res.render('tasks/index', {
      tasks,
      pageTitle: 'Task Management',
      successMessage: req.query.success as string,
      errorMessage: req.query.error as string
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    
    let errorMessage = 'Failed to load tasks. ';
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      
      if (error.code === 'ECONNREFUSED') {
        errorMessage += 'Please check if the backend is running on http://localhost:4000';
      } else if (error.response?.status) {
        errorMessage += `Server responded with status ${error.response.status}`;
      }
    } else {
      errorMessage += 'Please try again.';
    }
    
    res.render('tasks/index', {
      tasks: [],
      pageTitle: 'Task Management',
      errorMessage
    });
  }
});


router.get('/tasks/new', (req, res) => {
  res.render('tasks/new', {
    pageTitle: 'Create New Task',
    task: {},
    errors: {}
  });
});


router.post('/tasks', async (req, res) => {
  const { title, description, status, dueDate } = req.body;
  
  console.log('Received form data:', { title, description, status, dueDate });
  
  
  const errors: any = {};
  if (!title || title.trim().length === 0) {
    errors.title = 'Task title is required';
  }
  if (title && title.length > 255) {
    errors.title = 'Task title must be less than 255 characters';
  }
  if (description && description.length > 1000) {
    errors.description = 'Task description must be less than 1000 characters';
  }

  if (Object.keys(errors).length > 0) {
    return res.render('tasks/new', {
      pageTitle: 'Create New Task',
      task: { title, description, status, dueDate },
      errors
    });
  }

  try {
    const taskData: CreateTaskRequest = {
      title: title.trim(),
      description: description?.trim() || undefined,
      status: status || 'PENDING',
      dueDate: formatDateForBackend(dueDate)
    };

    console.log('Sending to backend:', taskData);

    const response = await axios.post(API_BASE_URL, taskData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Task created:', response.data);
    
    res.redirect('/tasks?success=' + encodeURIComponent(`Task "${title}" created successfully`));
  } catch (error) {
    console.error('Error creating task:', error);
    
    let errorMessage = 'Failed to create task. ';
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      
      if (error.response?.status === 400) {
        errorMessage += 'Please check your input data.';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage += 'Backend server is not reachable.';
      }
    }
    
    res.render('tasks/new', {
      pageTitle: 'Create New Task',
      task: { title, description, status, dueDate },
      errors: { general: errorMessage }
    });
  }
});


router.get('/tasks/:id', async (req, res) => {
  const taskId = parseInt(req.params.id);
  
  if (isNaN(taskId)) {
    return res.status(404).render('error', { 
      message: 'Invalid task ID',
      error: { status: 404 }
    });
  }
  
  try {
    const response = await axios.get<Task>(`${API_BASE_URL}/${taskId}`);
    const task = response.data;
    
    res.render('tasks/show', {
      task,
      pageTitle: `Task: ${task.title}`,
      successMessage: req.query.success as string,
      errorMessage: req.query.error as string
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      res.status(404).render('error', { 
        message: 'Task not found',
        error: { status: 404 }
      });
    } else {
      res.redirect('/tasks?error=' + encodeURIComponent('Failed to load task'));
    }
  }
});


router.post('/tasks/:id/status', async (req, res) => {
  const taskId = parseInt(req.params.id);
  const { status } = req.body;
  
  if (isNaN(taskId)) {
    return res.redirect('/tasks?error=' + encodeURIComponent('Invalid task ID'));
  }
  
  if (!status || !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
    return res.redirect(`/tasks/${taskId}?error=` + encodeURIComponent('Invalid status'));
  }
  
  try {
    await axios.put(`${API_BASE_URL}/${taskId}/status`, { status }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const statusText = status.toLowerCase().replace('_', ' ');
    res.redirect(`/tasks/${taskId}?success=` + encodeURIComponent(`Task status updated to ${statusText}`));
  } catch (error) {
    console.error('Error updating task status:', error);
    res.redirect(`/tasks/${taskId}?error=` + encodeURIComponent('Failed to update task status'));
  }
});


router.post('/tasks/:id/delete', async (req, res) => {
  const taskId = parseInt(req.params.id);
  
  if (isNaN(taskId)) {
    return res.redirect('/tasks?error=' + encodeURIComponent('Invalid task ID'));
  }
  
  try {
    
    const taskResponse = await axios.get<Task>(`${API_BASE_URL}/${taskId}`);
    const taskTitle = taskResponse.data.title;
    
    await axios.delete(`${API_BASE_URL}/${taskId}`);
    res.redirect('/tasks?success=' + encodeURIComponent(`Task "${taskTitle}" deleted successfully`));
  } catch (error) {
    console.error('Error deleting task:', error);
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      res.redirect('/tasks?error=' + encodeURIComponent('Task not found'));
    } else {
      res.redirect('/tasks?error=' + encodeURIComponent('Failed to delete task'));
    }
  }
});

export default (app: any) => {
  app.use('/', router);
};