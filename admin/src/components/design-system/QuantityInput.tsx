import React from 'react';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/solid';

interface QuantityInputProps {
  quantity: number;
  onQuantityChange: (newQuantity: number) => void;
  min?: number;
  max?: number; // Optional: for stock limits
  stockStatus?: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'On Demand';
}

const QuantityInput: React.FC<QuantityInputProps> = ({ 
    quantity, 
    onQuantityChange, 
    min = 1, 
    max = Infinity,
    stockStatus 
}) => {

  const handleDecrement = () => {
    if (quantity > min) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < max) {
      onQuantityChange(quantity + 1);
    } else if (quantity >= max && stockStatus !== 'Out of Stock' && stockStatus !== 'On Demand') { // Allow increment for on demand
        alert(`Maximum quantity of ${max} reached for this item.`);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newQuantity = parseInt(e.target.value, 10);
    if (isNaN(newQuantity)) {
      newQuantity = min;
    }
    if (newQuantity < min) newQuantity = min;
    
    if (newQuantity > max && stockStatus !== 'Out of Stock' && stockStatus !== 'On Demand') {
        newQuantity = max;
        alert(`Maximum quantity of ${max} reached for this item.`);
    }
    onQuantityChange(newQuantity);
  };
  
  const isDecrementDisabled = quantity <= min || stockStatus === 'Out of Stock';
  // Allow increment for 'On Demand' even if current quantity equals max (if max is not Infinity)
  const isIncrementDisabled = (quantity >= max && stockStatus !== 'On Demand') || stockStatus === 'Out of Stock';


  return (
    <div className="inline-flex items-center border border-gray-300 rounded-md overflow-hidden h-10 shadow-sm">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={isDecrementDisabled}
        className="px-3 h-full bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-swiss-mint"
        aria-label="Decrease quantity"
      >
        <MinusIcon className="w-4 h-4 text-gray-700" />
      </button>
      <input
        type="number"
        value={quantity}
        onChange={handleChange}
        min={min}
        // Conditionally set max attribute if it's not Infinity and not 'On Demand'
        max={(max !== Infinity && stockStatus !== 'On Demand') ? max : undefined}
        className="w-14 h-full text-center border-l border-r border-gray-300 focus:outline-none focus:ring-1 focus:ring-swiss-mint focus:z-10 disabled:bg-gray-50 text-sm font-medium text-gray-700 no-spinners"
        aria-label="Current quantity"
        disabled={stockStatus === 'Out of Stock'}
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={isIncrementDisabled}
        className="px-3 h-full bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-swiss-mint"
        aria-label="Increase quantity"
      >
        <PlusIcon className="w-4 h-4 text-gray-700" />
      </button>
    </div>
  );
};

export default QuantityInput;