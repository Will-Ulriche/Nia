export interface BaseSyncEntity {
  id: string;
  version: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  device_id: string | null;
  deleted_at: string | null;
}

export interface School extends BaseSyncEntity {
  name: string;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean | number;
}

export interface Profile extends BaseSyncEntity {
  school_id: string;
  role: 'super_admin' | 'direction' | 'secretaire' | 'professeur';
  first_name: string;
  last_name: string;
}

export interface SchoolModule extends BaseSyncEntity {
  school_id: string;
  module_name: 'college' | 'lycee' | 'primaire' | 'universite' | 'formation';
  is_active: boolean | number;
}

export interface SchoolSetting extends BaseSyncEntity {
  school_id: string;
  key: string;
  value: any; // jsonb mapping
}

export interface SchoolDevice extends BaseSyncEntity {
  school_id: string;
  device_name: string;
  last_sync_at: string | null;
  app_version: string | null;
  is_revoked: boolean | number;
}

export interface AcademicYear extends BaseSyncEntity {
  school_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | number;
}

export interface Section extends BaseSyncEntity {
  school_id: string;
  name: string;
}

export interface Level extends BaseSyncEntity {
  school_id: string;
  section_id: string;
  name: string;
  level_order: number;
}

export interface Series extends BaseSyncEntity {
  school_id: string;
  level_id: string;
  name: string;
}

export interface Class extends BaseSyncEntity {
  school_id: string;
  level_id: string;
  academic_year_id: string;
  series_id: string | null;
  name: string;
}

export interface Student extends BaseSyncEntity {
  school_id: string;
  matricule: string | null;
  first_name: string;
  last_name: string;
  gender: string | null;
  birth_date: string | null;
  birth_place: string | null;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  nationality: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  parent_name: string | null;
  parent_contact: string | null;
  parent_city: string | null;
  parent_neighborhood: string | null;
  parent_whatsapp: string | null;
  parent_profession: string | null;
  parent_relation: string | null;
  financial_sponsor: boolean | number | null;
  schooling_regime: string | null;
  previous_school: string | null;
  previous_class: string | null;
  previous_year: string | null;
}

export interface Teacher extends BaseSyncEntity {
  school_id: string;
  profile_id: string | null;
  first_name: string;
  last_name: string;
  contact_phone: string | null;
  contact_email: string | null;
}

export interface Subject extends BaseSyncEntity {
  school_id: string;
  name: string;
  code: string | null;
  description: string | null;
}

export interface ClassSubject extends BaseSyncEntity {
  school_id: string;
  academic_year_id: string;
  class_id: string;
  subject_id: string;
  coefficient: number | null;
  weekly_hours: number | null;
  subject_type: string | null;
  is_mandatory: number;
  is_active: number;
  teacher_id: string | null;
  color_icon: string | null;
  order_index: number;
}

export interface SubjectTemplate extends BaseSyncEntity {
  school_id: string;
  name: string;
}

export interface SubjectTemplateItem extends BaseSyncEntity {
  template_id: string;
  subject_id: string;
  coefficient: number | null;
  weekly_hours: number | null;
  subject_type: string | null;
  is_mandatory: number;
  order_index: number;
}

export interface Enrollment extends BaseSyncEntity {
  school_id: string;
  student_id: string;
  class_id: string;
  academic_year_id: string;
  status: string;
  enrollment_date: string;
}

export interface TeacherAssignment extends BaseSyncEntity {
  school_id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  academic_year_id: string;
}

export interface Schedule extends BaseSyncEntity {
  school_id: string;
  academic_year_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
}

export interface Period extends BaseSyncEntity {
  school_id: string;
  academic_year_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
}

export interface Assessment extends BaseSyncEntity {
  school_id: string;
  class_id: string;
  subject_id: string;
  period_id: string;
  teacher_id: string | null;
  title: string;
  assessment_date: string;
  total_score: number;
  weight: number;
}

export interface Grade extends BaseSyncEntity {
  school_id: string;
  assessment_id: string;
  student_id: string;
  score: number | null;
  is_absent: boolean | number;
  comments: string | null;
}

export interface Average extends BaseSyncEntity {
  school_id: string;
  student_id: string;
  period_id: string;
  class_id: string;
  subject_id: string | null; // null = general average
  average: number;
  rank: number | null;
  appreciation: string | null;
}

export interface Attendance extends BaseSyncEntity {
  school_id: string;
  student_id: string;
  class_id: string;
  period_id: string | null;
  date: string;
  status: string;
  justification: string | null;
}

export interface FeeDefinition extends BaseSyncEntity {
  school_id: string;
  academic_year_id: string;
  name: string;
  amount: number;
  description: string | null;
  is_mandatory: boolean | number;
}

export interface Payment extends BaseSyncEntity {
  school_id: string;
  student_id: string;
  academic_year_id: string;
  fee_definition_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference_number: string | null;
}

export interface Receipt extends BaseSyncEntity {
  school_id: string;
  payment_id: string;
  receipt_number: string;
  issued_by: string | null;
  issue_date: string;
}

export interface AuditLog extends BaseSyncEntity {
  school_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
}

export interface Expense extends BaseSyncEntity {
  school_id: string;
  academic_year_id: string;
  category: string;
  amount: number;
  expense_date: string;
  description: string | null;
  recorded_by: string | null;
}

export interface License extends BaseSyncEntity {
  school_id: string;
  license_key: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  valid_from: string | null;
  valid_until: string | null;
  max_devices: number;
  notes: string | null;
  created_by: string | null;
}
