import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation(['admin', 'common']);
    const [quantity, setQuantity] = useState(1);
    const [tabIndex, setTabIndex] = useState(0);

    const tabsContent = [
        { label: t('admin:designSystem.tabs.tab1'), content: <p>{t('admin:designSystem.tabs.content1')}</p> },
        { label: t('admin:designSystem.tabs.tab2'), content: <p>{t('admin:designSystem.tabs.content2')}</p> },
        { label: t('admin:designSystem.tabs.tab3'), content: <p>{t('admin:designSystem.tabs.content3')}</p>, disabled: true },
    ];

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold text-swiss-charcoal">{t('admin:designSystem.title')}</h1>
        <p className="mt-2 text-lg text-gray-600">{t('admin:designSystem.description')}</p>
      </div>

      {/* Colors Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-swiss-charcoal">{t('admin:designSystem.sections.colors')}</h2>
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
        <h2 className="text-2xl font-semibold mb-4 text-swiss-charcoal">{t('admin:designSystem.typography.title')}</h2>
        <Card className="p-8 space-y-4">
          <p className="text-xs text-gray-500">{t('admin:designSystem.typography.fontFamily')}</p>
          <h1 className="text-4xl font-bold">{t('admin:designSystem.typography.heading1')}</h1>
          <h2 className="text-3xl font-bold">{t('admin:designSystem.typography.heading2')}</h2>
          <h3 className="text-2xl font-semibold">{t('admin:designSystem.typography.heading3')}</h3>
          <h4 className="text-xl font-semibold">{t('admin:designSystem.typography.heading4')}</h4>
          <p className="text-base">{t('admin:designSystem.typography.bodyBase')}</p>
          <p className="text-sm">{t('admin:designSystem.typography.bodySmall')}</p>
          <a href="#" className="text-swiss-mint hover:underline">{t('admin:designSystem.typography.link')}</a>
        </Card>
      </section>

      {/* Buttons Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-swiss-charcoal">{t('admin:designSystem.buttons.title')}</h2>
        <Card className="p-8 space-y-6">
          <div>
            <h3 className="font-medium mb-3">{t('admin:designSystem.buttons.variants')}</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary">{t('admin:designSystem.buttons.primary')}</Button>
              <Button variant="secondary">{t('admin:designSystem.buttons.secondary')}</Button>
              <Button variant="danger">{t('admin:designSystem.buttons.danger')}</Button>
              <Button variant="outline">{t('admin:designSystem.buttons.outline')}</Button>
              <Button variant="ghost">{t('admin:designSystem.buttons.ghost')}</Button>
              <Button variant="light">{t('admin:designSystem.buttons.light')}</Button>
            </div>
          </div>
           <div>
            <h3 className="font-medium mb-3">{t('admin:designSystem.buttons.sizes')}</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="xs">{t('admin:designSystem.buttons.extraSmall')}</Button>
              <Button variant="primary" size="sm">{t('admin:designSystem.buttons.small')}</Button>
              <Button variant="primary" size="md">{t('admin:designSystem.buttons.mediumDefault')}</Button>
              <Button variant="primary" size="lg">{t('admin:designSystem.buttons.large')}</Button>
            </div>
          </div>
           <div>
            <h3 className="font-medium mb-3">{t('admin:designSystem.buttons.withIcons')}</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="secondary" leftIcon={PlusIcon}>{t('admin:designSystem.buttons.leftIcon')}</Button>
              <Button variant="outline" rightIcon={ArrowRightIcon}>{t('admin:designSystem.buttons.rightIcon')}</Button>
              <Button variant="primary" leftIcon={CheckIcon} size="sm">{t('admin:designSystem.buttons.smallIcon')}</Button>
              <Button variant="danger" leftIcon={PlusIcon} />
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-3">{t('admin:designSystem.buttons.disabledState')}</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" disabled>{t('admin:designSystem.buttons.primaryDisabled')}</Button>
              <Button variant="secondary" disabled>{t('admin:designSystem.buttons.secondaryDisabled')}</Button>
               <Button variant="outline" disabled>{t('admin:designSystem.buttons.outlineDisabled')}</Button>
            </div>
          </div>
        </Card>
      </section>

       {/* Cards Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-swiss-charcoal">{t('admin:designSystem.sections.cards')}</h2>
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
        <h2 className="text-2xl font-semibold mb-4 text-swiss-charcoal">{t('admin:designSystem.formControls.title')}</h2>
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