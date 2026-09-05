export type Cantiere = {
  id: string;
  name: string;
  address?: string;
};

export type EmployeeReport = {
  id: string;
  date: string;
  month_key: string;
  cantiere_id: string;
  cantiere_name: string;
  hours: number;
  drove_vehicle: boolean;
  description: string;
  photos: string[];
  approved: boolean;
};

export type AdminReport = EmployeeReport & {
  user_id: string;
  user_name: string;
  admin_edited: boolean;
};

export type MatrixEmployee = {
  user_id: string;
  name: string;
  daily: Record<string, number>;
  total: number;
};

export type Matrix = {
  month: string;
  days: number[];
  employees: MatrixEmployee[];
};

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: "employee" | "admin";
  approved: boolean;
};

export type CantiereSummary = {
  cantiere_id: string;
  cantiere_name: string;
  hours: number;
  days: number;
  reports: number;
  employees: number;
};
