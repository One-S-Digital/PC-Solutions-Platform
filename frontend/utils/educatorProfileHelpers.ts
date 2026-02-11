import { CertificationItem, EducationItem, WorkExperienceItem } from '../types';

export const createTempId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const splitLines = (value: string) =>
  value
    .split(/\r?\n|- /g)
    .map((line) => line.trim())
    .filter(Boolean);

export const fallbackWorkExperienceFromText = (value: string): WorkExperienceItem[] => {
  if (!value || !value.trim()) return [];
  return [
    {
      id: createTempId('legacy-work'),
      jobTitle: '',
      institutionName: '',
      startDate: '',
      endDate: '',
      descriptionPoints: splitLines(value),
    },
  ];
};

export const fallbackEducationFromText = (value: string): EducationItem[] => {
  if (!value || !value.trim()) return [];
  return [
    {
      id: createTempId('legacy-edu'),
      degree: '',
      institutionName: '',
      graduationYear: '',
      description: value.trim(),
    },
  ];
};

export const certificationItemsFromNames = (names: string[]): CertificationItem[] =>
  names.map((name, index) => ({
    id: `cert-${index}-${Date.now()}`,
    name,
    issuingOrganization: '',
    issueDate: '',
  }));
