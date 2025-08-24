import { Router } from 'express';
import axios from 'axios';

const router = Router();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api/tasks';

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

// GET /tasks - Display all tasks
router.get('/tasks', async (req, res) => {
  try {
    const response = await axios.get<Task[]>(API_BASE_URL);
    const tasks = response.data;
    
    res.render('tasks/index', {
      tasks,
      pageTitle: 'Task Management',
      successMessage: req.query.success,
      errorMessage: req.query.error
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.render('tasks/index', {
      tasks: [],
      pageTitle: 'Task Management',
      errorMessage: 'Failed to load tasks. Please try again.'
    });
  }
});

// GET /tasks/new - Display create task form
router.get('/tasks/new', (req, res) => {
  res.render('tasks/new', {
    pageTitle: 'Create New Task',
    task: {},
    errors: {}
  });
});

// POST /tasks - Create a new task
router.post('/tasks', async (req, res) => {
  const { title, description, status, dueDate } = req.body;
  
  // Validation
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
      dueDate: dueDate || undefined
    };

    await axios.post(API_BASE_URL, taskData);
    res.redirect('/tasks?success=' + encodeURIComponent(`Task "${title}" created successfully`));
  } catch (error) {
    console.error('Error creating task:', error);
    res.render('tasks/new', {
      pageTitle: 'Create New Task',
      task: { title, description, status, dueDate },
      errors: { general: 'Failed to create task. Please try again.' }
    });
  }
});

// GET /tasks/:id - Display single task
router.get('/tasks/:id', async (req, res) => {
  const taskId = parseInt(req.params.id);
  
  try {
    const response = await axios.get<Task>(`${API_BASE_URL}/${taskId}`);
    const task = response.data;
    
    res.render('tasks/show', {
      task,
      pageTitle: `Task: ${task.title}`,
      successMessage: req.query.success,
      errorMessage: req.query.error
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

// POST /tasks/:id/status - Update task status
router.post('/tasks/:id/status', async (req, res) => {
  const taskId = parseInt(req.params.id);
  const { status } = req.body;
  
  try {
    await axios.put(`${API_BASE_URL}/${taskId}/status`, { status });
    res.redirect(`/tasks/${taskId}?success=` + encodeURIComponent(`Task status updated to ${status.toLowerCase().replace('_', ' ')}`));
  } catch (error) {
    console.error('Error updating task status:', error);
    res.redirect(`/tasks/${taskId}?error=` + encodeURIComponent('Failed to update task status'));
  }
});

// POST /tasks/:id/delete - Delete task
router.post('/tasks/:id/delete', async (req, res) => {
  const taskId = parseInt(req.params.id);
  
  try {
    // Get task title before deletion for confirmation message
    const taskResponse = await axios.get<Task>(`${API_BASE_URL}/${taskId}`);
    const taskTitle = taskResponse.data.title;
    
    await axios.delete(`${API_BASE_URL}/${taskId}`);
    res.redirect('/tasks?success=' + encodeURIComponent(`Task "${taskTitle}" deleted successfully`));
  } catch (error) {
    console.error('Error deleting task:', error);
    res.redirect('/tasks?error=' + encodeURIComponent('Failed to delete task'));
  }
});

export default (app: any) => {
  app.use('/', router);
};