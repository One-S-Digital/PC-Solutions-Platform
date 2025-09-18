const isDev = import.meta.env.DEV;

const logger = {

  log: (...args: unknown[]) => {

    if (isDev) {
      console.log(...args);
    }
  },

  warn: (...args: unknown[]) => {

    if (isDev) {
      console.warn(...args);
    }
  },

  error: (...args: unknown[]) => {

    // Errors should probably be logged in production too, but for now, I'll stick to the user's request.
    // In a real-world scenario, you would use a proper logging service for production errors.
    if (isDev) {
      console.error(...args);
    }
  },
};

export default logger;
