// Types for the signup form
export enum SignupRole {
  FOUNDATION = 'FOUNDATION',
  SUPPLIER = 'SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  PARENT = 'PARENT',
}

export interface SignupFormData {
  organisationName: string;
  contactPerson: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  canton: string;
  languagesSpoken: string[];
  capacity?: number;
  category: string;
  serviceType: string;
  childAge?: number;
  childStartDate: string;
  termsAccepted: boolean;
}

export type SwissCanton = string;
export type SupportedLanguage = string;