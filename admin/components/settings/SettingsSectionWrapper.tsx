
import React from 'react';
import Card from '../ui/Card';

interface SettingsSectionWrapperProps {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  id?: string; // For scrolling
}

const SettingsSectionWrapper: React.FC<SettingsSectionWrapperProps> = ({ title, icon: Icon, children, id }) => {
  return (
    <Card className="p-6" id={id}>
      <div className="flex items-center mb-6">
        {Icon && <Icon className="w-7 h-7 mr-3 text-swiss-teal" />}
        <h2 className="text-2xl font-semibold text-swiss-charcoal">{title}</h2>
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </Card>
  );
};

export default SettingsSectionWrapper;
