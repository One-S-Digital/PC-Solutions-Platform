import {
  EducatorCertificationItemDto,
  EducatorEducationItemDto,
  EducatorWorkExperienceItemDto,
} from '../settings/dto/educator-settings.dto';

export const normalizeWorkExperienceItems = (
  items: EducatorWorkExperienceItemDto[] = [],
) =>
  items
    .map((item) => ({
      jobTitle: item.jobTitle?.trim() || '',
      institutionName: item.institutionName?.trim() || '',
      startDate: item.startDate?.trim() || null,
      endDate: item.endDate?.trim() || null,
      descriptionPoints: (item.descriptionPoints || [])
        .map((point) => point.trim())
        .filter(Boolean),
    }))
    .filter((item) => item.jobTitle || item.institutionName || item.descriptionPoints.length > 0);

export const normalizeEducationItems = (items: EducatorEducationItemDto[] = []) =>
  items
    .map((item) => ({
      degree: item.degree?.trim() || '',
      institutionName: item.institutionName?.trim() || '',
      graduationYear: item.graduationYear?.trim() || null,
      description: item.description?.trim() || null,
    }))
    .filter((item) => item.degree || item.institutionName || item.description);

export const normalizeCertificationItems = (
  items: EducatorCertificationItemDto[] = [],
) =>
  items
    .map((item) => ({
      name: item.name?.trim() || '',
      issuingOrganization: item.issuingOrganization?.trim() || null,
      issueDate: item.issueDate?.trim() || null,
      expiryDate: item.expiryDate?.trim() || null,
      credentialUrl: item.credentialUrl?.trim() || null,
    }))
    .filter((item) => item.name);

export const formatWorkExperienceText = (
  items: ReturnType<typeof normalizeWorkExperienceItems>,
) =>
  items
    .map((item) => {
      const roleLine = [item.jobTitle, item.institutionName].filter(Boolean).join(' — ');
      const dateLine = [item.startDate, item.endDate].filter(Boolean).join(' - ');
      const description = item.descriptionPoints.length
        ? item.descriptionPoints.map((point) => `- ${point}`).join('\n')
        : '';
      return [roleLine, dateLine, description].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');

export const formatEducationText = (
  items: ReturnType<typeof normalizeEducationItems>,
) =>
  items
    .map((item) => {
      const header = [item.degree, item.institutionName].filter(Boolean).join(' — ');
      const details = [item.graduationYear, item.description].filter(Boolean).join(' ');
      return [header, details].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
