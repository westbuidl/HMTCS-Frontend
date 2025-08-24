import { Router } from 'express';
import axios from 'axios';

const router = Router();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

router.get('/', async (req, res) => {
  try {
    
    const caseResponse = await axios.get(`${API_BASE_URL}/get-example-case`);
    const example = caseResponse.data;
    
    
    let taskSummary = null;
    try {
      const taskResponse = await axios.get(`${API_BASE_URL}/api/tasks`);
      const tasks = taskResponse.data;
      taskSummary = {
        total: tasks.length,
        pending: tasks.filter((t: any) => t.status === 'PENDING').length,
        inProgress: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
        completed: tasks.filter((t: any) => t.status === 'COMPLETED').length,
        overdue: tasks.filter((t: any) => {
          if (!t.dueDate || t.status === 'COMPLETED') return false;
          return new Date(t.dueDate) < new Date();
        }).length
      };
    } catch (taskError) {
      console.warn('Could not fetch task summary:', taskError.message);
    }

    res.render('home', {
      pageTitle: 'HMCTS Task Management System',
      example,
      taskSummary
    });
  } catch (error) {
    console.error('Error loading home page:', error);
    res.render('home', {
      pageTitle: 'HMCTS Task Management System',
      example: null,
      taskSummary: null,
      errorMessage: 'Some services may be unavailable'
    });
  }
});

export default (app: any) => {
  app.use('/', router);
};