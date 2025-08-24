import * as path from 'path';

import * as express from 'express';
import * as nunjucks from 'nunjucks';

export class Nunjucks {
  constructor(public developmentMode: boolean) {
    this.developmentMode = developmentMode;
  }

  enableFor(app: express.Express): void {
    app.set('view engine', 'njk');
    
    const nunjucksEnv = nunjucks.configure(path.join(__dirname, '..', '..', 'views'), {
      autoescape: true,
      watch: this.developmentMode,
      express: app,
    });

    // Add custom filters without moment.js dependency
    nunjucksEnv.addFilter('truncate', function(str, length) {
      if (!str) return '';
      if (str.length <= length) return str;
      return str.substring(0, length) + '...';
    });

    nunjucksEnv.addFilter('nl2br', function(str) {
      if (!str) return '';
      return str.replace(/\n/g, '<br>');
    });

    // Add date formatting filter using native Date
    nunjucksEnv.addFilter('formatDate', function(dateString, format = 'DD/MM/YYYY HH:mm') {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      if (format === 'DD/MM/YYYY HH:mm') {
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      }
      
      return date.toLocaleDateString('en-GB');
    });

    // Add comprehensive date filter to match what's used in show.njk
    nunjucksEnv.addFilter('date', function(dateString, format = 'DD/MM/YYYY HH:mm') {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      
      // Handle Unix timestamp format (X)
      if (format === 'X') {
        return Math.floor(date.getTime() / 1000).toString();
      }
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = date.toLocaleDateString('en-GB', { month: 'long' });
      const monthShort = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      // Handle different format patterns
      if (format === 'DD MMMM YYYY [at] HH:mm') {
        return `${day} ${month} ${year} at ${hours}:${minutes}`;
      }
      
      if (format === 'DD/MM/YYYY HH:mm') {
        return `${day}/${monthShort}/${year} ${hours}:${minutes}`;
      }
      
      // Default format
      return date.toLocaleDateString('en-GB');
    });

    // Add function to check if date is overdue
    nunjucksEnv.addFilter('isOverdue', function(dateString) {
      if (!dateString) return false;
      const date = new Date(dateString);
      return date < new Date();
    });

    // Add moment-like function for current time (used in show.njk)
    nunjucksEnv.addGlobal('moment', function() {
      return new Date();
    });

    app.use((req, res, next) => {
      res.locals.pagePath = req.path;
      next();
    });
  }
}