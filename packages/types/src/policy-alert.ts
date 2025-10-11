/**
 * Policy alert types
 */
export enum AlertType {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Swiss regions/cantons
 */
export enum SwissRegion {
  AG = 'AG',
  AI = 'AI',
  AR = 'AR',
  BE = 'BE',
  BL = 'BL',
  BS = 'BS',
  FR = 'FR',
  GE = 'GE',
  GL = 'GL',
  GR = 'GR',
  JU = 'JU',
  LU = 'LU',
  NE = 'NE',
  NW = 'NW',
  OW = 'OW',
  SG = 'SG',
  SH = 'SH',
  SO = 'SO',
  SZ = 'SZ',
  TG = 'TG',
  TI = 'TI',
  UR = 'UR',
  VD = 'VD',
  VS = 'VS',
  ZG = 'ZG',
  ZH = 'ZH',
  FEDERAL = 'FEDERAL',
}

/**
 * Policy alert interface
 */
export interface PolicyAlert {
  id: string;
  title: string;
  message: string;
  alertType: AlertType;
  regions: SwissRegion[];
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create policy alert payload
 */
export interface CreatePolicyAlertPayload {
  title: string;
  message: string;
  alertType: AlertType;
  regions: SwissRegion[];
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

/**
 * Update policy alert payload
 */
export interface UpdatePolicyAlertPayload {
  title?: string;
  message?: string;
  alertType?: AlertType;
  regions?: SwissRegion[];
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}
