import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import QuantityInput from '../components/ui/QuantityInput';
import { STANDARD_INPUT_FIELD } from '../constants';
import { ArrowRightIcon, CheckIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation(['dashboard', 'common']);
    const [quantity, setQuantity] = useState(1);
    const [tabIndex, setTabIndex] = useState(0);

    const tabsContent = [
        { label: t('designSystemPage.tabs.tab1'), content: <p>{t('designSystemPage.tabs.content1')}</p> },
        { label: t('designSystemPage.tabs.tab2'), content: <p>{t('designSystemPage.tabs.content2')}</p> },
        { label: t('designSystemPage.tabs.tab3'), content: <p>{t('designSystemPage.tabs.content3')}</p>, disabled: true },
    ];

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold text-swiss-charcoal">{t('designSystemPage.title')}</h1>
        <p className="mt-2 text-lg text-gray-600">{t('designSystemPage.description')}</p>
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
          <p className="text-xs text-gray-500">{t('designSystemPage.typography.fontFamily')}</p>
          <h1 className="text-4xl font-bold">{t('designSystemPage.typography.heading1')}</h1>
          <h2 className="text-3xl font-bold">{t('designSystemPage.typography.heading2')}</h2>
          <h3 className="text-2xl font-semibold">{t('designSystemPage.typography.heading3')}</h3>
          <h4 className="text-xl font-semibold">{t('designSystemPage.typography.heading4')}</h4>
          <p className="text-base">{t('designSystemPage.typography.bodyBase')}</p>
          <p className="text-sm">{t('designSystemPage.typography.bodySmall')}</p>
          <a href="#" className="text-swiss-mint hover:underline">{t('designSystemPage.typography.link')}</a>
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
              <Button variant="primary" size="xs">{t('designSystemPage.buttons.extraSmall')}</Button>
              <Button variant="primary" size="sm">{t('designSystemPage.buttons.small')}</Button>
              <Button variant="primary" size="md">{t('designSystemPage.buttons.mediumDefault')}</Button>
              <Button variant="primary" size="lg">{t('designSystemPage.buttons.large')}</Button>
            </div>
          </div>
           <div>
            <h3 className="font-medium mb-3">{t('designSystemPage.buttons.withIcons')}</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="secondary" leftIcon={PlusIcon}>{t('designSystemPage.buttons.leftIcon')}</Button>
              <Button variant="outline" rightIcon={ArrowRightIcon}>{t('designSystemPage.buttons.rightIcon')}</Button>
              <Button variant="primary" leftIcon={CheckIcon} size="sm">{t('designSystemPage.buttons.smallIcon')}</Button>
              <Button variant="danger" leftIcon={PlusIcon} />
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-3">{t('designSystemPage.buttons.disabledState')}</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" disabled>{t('designSystemPage.buttons.primaryDisabled')}</Button>
              <Button variant="secondary" disabled>{t('designSystemPage.buttons.secondaryDisabled')}</Button>
               <Button variant="outline" disabled>{t('designSystemPage.buttons.outlineDisabled')}</Button>
            </div>
          </div>
        </Card>
      </section>

       {/* Cards Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-swiss-charcoal">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
                <h3 className="font-semibold mb-2">{t('designSystemPage.cards.standardCard')}</h3>
                <p className="text-sm text-gray-600">{t('designSystemPage.cards.standardCardDesc')}</p>
            </Card>
             <Card className="p-6" hoverEffect>
                <h3 className="font-semibold mb-2">{t('designSystemPage.cards.hoverEffectCard')}</h3>
                <p className="text-sm text-gray-600">{t('designSystemPage.cards.hoverEffectCardDesc')}</p>
            </Card>
        </div>
      </section>

      {/* Form Controls Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-swiss-charcoal">{t('designSystemPage.formControls.title')}</h2>
        <Card className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div>
                    <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 mb-1">{t('designSystemPage.formControls.textInput')}</label>
                    <input type="text" id="text-input" className={STANDARD_INPUT_FIELD} placeholder="e.g., Jane Doe"/>
                </div>
                 <div>
                    <label htmlFor="select-input" className="block text-sm font-medium text-gray-700 mb-1">{t('designSystemPage.formControls.selectMenu')}</label>
                    <select id="select-input" className={STANDARD_INPUT_FIELD}>
                        <option>{t('designSystemPage.formControls.option1')}</option>
                        <option>{t('designSystemPage.formControls.option2')}</option>
                        <option>{t('designSystemPage.formControls.option3')}</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="textarea-input" className="block text-sm font-medium text-gray-700 mb-1">Textarea</label>
                    <textarea id="textarea-input" rows={4} className={STANDARD_INPUT_FIELD} placeholder="Enter details here..."></textarea>
                </div>
            </div>
             <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('designSystemPage.formControls.quantityInput')}</label>
                    <QuantityInput quantity={quantity} onQuantityChange={setQuantity} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('designSystemPage.formControls.disabledInput')}</label>
                    <input type="text" className={STANDARD_INPUT_FIELD} placeholder="You can't type here" disabled/>
                </div>
            </div>
        </Card>
      </section>
      
      {/* Tabs Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-swiss-charcoal">{t('designSystemPage.tabs.title')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-6">
                <h3 className="font-medium mb-3">{t('designSystemPage.tabs.pillsVariant')}</h3>
                <Tabs tabs={tabsContent} onTabChange={setTabIndex} activeTab={tabIndex} variant="pills" />
            </Card>
             <Card className="p-6">
                <h3 className="font-medium mb-3">{t('designSystemPage.tabs.lineVariant')}</h3>
                <Tabs tabs={tabsContent} onTabChange={setTabIndex} activeTab={tabIndex} variant="line" />
            </Card>
        </div>
      </section>

    </div>
  );
};

export default DesignSystemPage;