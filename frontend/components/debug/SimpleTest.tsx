import React from 'react';

export const SimpleTest: React.FC = () => {
  console.log('SimpleTest component is rendering');
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '200px',
        height: '50px',
        backgroundColor: 'red',
        color: 'white',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        fontWeight: 'bold'
      }}
    >
      TEST VISIBLE
    </div>
  );
};
