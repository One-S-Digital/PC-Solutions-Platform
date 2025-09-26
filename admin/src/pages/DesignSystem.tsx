import React, { useState } from 'react';
import Card from '../components/design-system/Card';
import Button from '../components/design-system/Button';
import Tabs from '../components/design-system/Tabs';
import QuantityInput from '../components/design-system/QuantityInput';
import { STANDARD_INPUT_FIELD } from '../constants/design-system';
import { ArrowRightIcon, CheckIcon, PlusIcon } from '@heroicons/react/24/outline';

const colorPalette = {
  'swiss-mint': '#48CFAE',
  'swiss-sand': '#F3D29E',
  'swiss-coral': '#FE6D73',
  'swiss-teal': '#227C9D',
  'swiss-charcoal': '#2B2B2B',
  'swiss-light-gray': '#F3F4F6',
  'page-bg': '#F9FAFB',
};

const ColorSwatch: React.FC<{ name: string; hex: string }> = ({ name, hex }) => (
  <div className="flex flex-col items-center">
    <div className="w-24 h-24 rounded-full shadow-inner" style={{ backgroundColor: hex }}></div>
    <div className="text-center mt-2">
      <p className="font-semibold text-sm text-swiss-charcoal">{name}</p>
      <p className="text-xs text-gray-500 font-mono">{hex}</p>
    </div>
  </div>
);

const DesignSystemPage: React.FC = () => {
    const [quantity, setQuantity] = useState(1);
    const [tabIndex, setTabIndex] = useState(0);

    const tabsContent = [
        { label: 'Tab 1', content: <p>This is the content for Tab 1.</p> },
        { label: 'Tab 2', content: <p>This is the content for Tab 2.</p> },
        { label: 'Tab 3', content: <p>This is a disabled tab.</p>, disabled: true },
    ];

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold text-swiss-charcoal">Design System</h1>
        <p className="mt-2 text-lg text-gray-600">A living reference for all UI components and design tokens in the Pro Crèche Solutions application.</p>
      </div>

      {/* Colors Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-swiss-charcoal">Colors</h2>
        <Card className="p-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-8">
            {Object.entries(colorPalette).map(([name, hex]) => (
              <ColorSwatch key={name} name={name} hex={hex} />
            ))}
          </div>
        </Card>
      </section>

      {/* Typography Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-swiss-charcoal">Typography</h2>
        <Card className="p-8 space-y-4">
          <p className="text-xs text-gray-500">Font Family: Nunito, Inter, sans-serif</p>
          <h1 className="text-4xl font-bold">Heading 1: The quick brown fox</h1>
          <h2 className="text-3xl font-bold">Heading 2: The quick brown fox</h2>
          <h3 className="text-2xl font-semibold">Heading 3: The quick brown fox</h3>
          <h4 className="text-xl font-semibold">Heading 4: The quick brown fox</h4>
          <p className="text-base">Body Text (Base): Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.</p>
          <p className="text-sm">Body Text (Small): Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi.</p>
          <a href="#" className="text-swiss-mint hover:underline">This is a link</a>
        </Card>
      </section>

      {/* Buttons Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-swiss-charcoal">Buttons</h2>
        <Card className="p-8 space-y-6">
          <div>
            <h3 className="font-medium mb-3">Variants</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="light">Light</Button>
            </div>
          </div>
           <div>
            <h3 className="font-medium mb-3">Sizes</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="xs">Extra Small</Button>
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium (Default)</Button>
              <Button variant="primary" size="lg">Large</Button>
            </div>
          </div>
           <div>
            <h3 className="font-medium mb-3">With Icons</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="secondary" leftIcon={PlusIcon}>Left Icon</Button>
              <Button variant="outline" rightIcon={ArrowRightIcon}>Right Icon</Button>
              <Button variant="primary" leftIcon={CheckIcon} size="sm">Small Icon</Button>
              <Button variant="danger" leftIcon={PlusIcon} />
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-3">Disabled State</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" disabled>Primary Disabled</Button>
              <Button variant="secondary" disabled>Secondary Disabled</Button>
               <Button variant="outline" disabled>Outline Disabled</Button>
            </div>
          </div>
        </Card>
      </section>

       {/* Cards Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-swiss-charcoal">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
                <h3 className="font-semibold mb-2">Standard Card</h3>
                <p className="text-sm text-gray-600">This is a standard card component with a soft shadow. It's the base for most content containers.</p>
            </Card>
             <Card className="p-6" hoverEffect>
                <h3 className="font-semibold mb-2">Hover Effect Card</h3>
                <p className="text-sm text-gray-600">This card has a subtle scale and shadow transition on hover, useful for interactive elements.</p>
            </Card>
        </div>
      </section>

      {/* Form Controls Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-swiss-charcoal">Form Controls</h2>
        <Card className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div>
                    <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 mb-1">Text Input</label>
                    <input type="text" id="text-input" className={STANDARD_INPUT_FIELD} placeholder="e.g., Jane Doe"/>
                </div>
                 <div>
                    <label htmlFor="select-input" className="block text-sm font-medium text-gray-700 mb-1">Select Menu</label>
                    <select id="select-input" className={STANDARD_INPUT_FIELD}>
                        <option>Option 1</option>
                        <option>Option 2</option>
                        <option>Option 3</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="textarea-input" className="block text-sm font-medium text-gray-700 mb-1">Textarea</label>
                    <textarea id="textarea-input" rows={4} className={STANDARD_INPUT_FIELD} placeholder="Enter details here..."></textarea>
                </div>
            </div>
             <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Input</label>
                    <QuantityInput quantity={quantity} onQuantityChange={setQuantity} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Disabled Input</label>
                    <input type="text" className={STANDARD_INPUT_FIELD} placeholder="You can't type here" disabled/>
                </div>
            </div>
        </Card>
      </section>
      
      {/* Tabs Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-swiss-charcoal">Tabs</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-6">
                <h3 className="font-medium mb-3">Pills Variant (Default)</h3>
                <Tabs tabs={tabsContent} onTabChange={setTabIndex} activeTab={tabIndex} variant="pills" />
            </Card>
             <Card className="p-6">
                <h3 className="font-medium mb-3">Line Variant</h3>
                <Tabs tabs={tabsContent} onTabChange={setTabIndex} activeTab={tabIndex} variant="line" />
            </Card>
        </div>
      </section>

    </div>
  );
};

export default DesignSystemPage;