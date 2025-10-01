import * as React from 'react';

export default function ELearningPage() {
  return (
    React.createElement('div', { className: 'min-h-screen frontend-page bg-swiss-light py-8' },
      React.createElement('div', { className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' },
        React.createElement('div', { className: 'p-6 bg-white rounded-lg shadow' },
          React.createElement('h1', { className: 'text-2xl font-bold mb-2' }, 'E-Learning'),
          React.createElement('p', { className: 'text-swiss-gray' }, 'Placeholder page for E-Learning content.')
        )
      )
    )
  );
}
