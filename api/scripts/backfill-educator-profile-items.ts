import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

type WorkExperienceInput = {
  jobTitle?: string;
  institutionName?: string;
  startDate?: string;
  endDate?: string;
  descriptionPoints?: string[] | string;
  description?: string;
  company?: string;
  organization?: string;
  title?: string;
};

type EducationInput = {
  degree?: string;
  institutionName?: string;
  graduationYear?: string;
  description?: string;
  school?: string;
};

const parseJsonArray = <T>(value: string | null | undefined): T[] | null => {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
};

const splitDescriptionPoints = (value?: string[] | string): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }
  if (!value) return [];
  return value
    .split(/\r?\n|•|- /g)
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeWorkExperience = (items: WorkExperienceInput[]): WorkExperienceInput[] => {
  return items
    .map((item) => ({
      jobTitle: item.jobTitle || item.title || '',
      institutionName: item.institutionName || item.company || item.organization || '',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      descriptionPoints: splitDescriptionPoints(item.descriptionPoints ?? item.description),
    }))
    .filter((item) => item.jobTitle || item.institutionName || item.descriptionPoints.length > 0);
};

const normalizeEducation = (items: EducationInput[]): EducationInput[] => {
  return items
    .map((item) => ({
      degree: item.degree || '',
      institutionName: item.institutionName || item.school || '',
      graduationYear: item.graduationYear || '',
      description: item.description || '',
    }))
    .filter((item) => item.degree || item.institutionName || item.description);
};

const fallbackWorkExperience = (raw: string): WorkExperienceInput[] => {
  const descriptionPoints = splitDescriptionPoints(raw);
  if (descriptionPoints.length === 0) return [];
  return [
    {
      jobTitle: 'Experience',
      institutionName: '',
      startDate: '',
      endDate: '',
      descriptionPoints,
    },
  ];
};

const fallbackEducation = (raw: string): EducationInput[] => {
  const description = raw.trim();
  if (!description) return [];
  return [
    {
      degree: 'Education',
      institutionName: '',
      graduationYear: '',
      description,
    },
  ];
};

async function main() {
  const educators = await prisma.user.findMany({
    where: {
      role: UserRole.EDUCATOR,
      OR: [
        { workExperience: { not: null } },
        { education: { not: null } },
        { certifications: { isEmpty: false } },
      ],
    },
    include: {
      workExperienceItems: { select: { id: true } },
      educationItems: { select: { id: true } },
      certificationItems: { select: { id: true } },
    },
  });

  let processed = 0;
  let createdWork = 0;
  let createdEducation = 0;
  let createdCerts = 0;

  for (const educator of educators) {
    try {
      const workItemsExist = educator.workExperienceItems.length > 0;
      const educationItemsExist = educator.educationItems.length > 0;
      const certItemsExist = educator.certificationItems.length > 0;

      const workParsed = parseJsonArray<WorkExperienceInput>(educator.workExperience);
      const educationParsed = parseJsonArray<EducationInput>(educator.education);

      const normalizedWork = workParsed
        ? normalizeWorkExperience(workParsed)
        : educator.workExperience
        ? fallbackWorkExperience(educator.workExperience)
        : [];
      const normalizedEducation = educationParsed
        ? normalizeEducation(educationParsed)
        : educator.education
        ? fallbackEducation(educator.education)
        : [];

      const certNames = Array.isArray(educator.certifications) ? educator.certifications : [];

      if (!workItemsExist && normalizedWork.length > 0) {
        await prisma.educatorWorkExperience.createMany({
          data: normalizedWork.map((item, index) => ({
            userId: educator.id,
            jobTitle: item.jobTitle || 'Experience',
            institutionName: item.institutionName || '',
            startDate: item.startDate || null,
            endDate: item.endDate || null,
            descriptionPoints: Array.isArray(item.descriptionPoints) ? item.descriptionPoints : [],
            sortOrder: index,
          })),
        });
        createdWork += normalizedWork.length;
      }

      if (!educationItemsExist && normalizedEducation.length > 0) {
        await prisma.educatorEducation.createMany({
          data: normalizedEducation.map((item, index) => ({
            userId: educator.id,
            degree: item.degree || 'Education',
            institutionName: item.institutionName || '',
            graduationYear: item.graduationYear || null,
            description: item.description || null,
            sortOrder: index,
          })),
        });
        createdEducation += normalizedEducation.length;
      }

      if (!certItemsExist && certNames.length > 0) {
        await prisma.educatorCertification.createMany({
          data: certNames.map((name, index) => ({
            userId: educator.id,
            name,
            issuingOrganization: null,
            issueDate: null,
            expiryDate: null,
            credentialUrl: null,
            sortOrder: index,
          })),
        });
        createdCerts += certNames.length;
      }

      processed += 1;
    } catch (err) {
      console.error(`Failed to backfill educator ${educator.id}:`, err);
      process.exitCode = 1;
    }
  }

  console.log(
    `Backfill complete. Users processed: ${processed}. Created work entries: ${createdWork}, education entries: ${createdEducation}, certifications: ${createdCerts}.`,
  );
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
