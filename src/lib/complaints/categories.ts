/**
 * Campus complaint categories shown to students.
 * Names must match active seed rows in supabase/migrations/0008_seed_data.sql.
 * The education-only MVP leaves housing/dining out of student intake.
 */
export const COMPLAINT_CATEGORIES = [
  'Grading & Academic Evaluation',
  'Teaching Quality & Instructor Conduct',
  'Registration, Enrollment & Add/Drop',
  'Tuition, Billing & Financial Clearance',
  'Facilities, Laboratories & Library',
  'Harassment, Discrimination & Gender Issues',
  'Bribery, Fraud & Academic Malpractice',
  'General Feedback & Other Inquiries',
] as const;

export type ComplaintCategoryName = (typeof COMPLAINT_CATEGORIES)[number];
