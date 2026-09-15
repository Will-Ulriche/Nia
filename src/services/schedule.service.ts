import { supabase } from './supabase';
import type { Schedule } from '../types/database';

export class ScheduleService {
  static async listClassSchedules(schoolId: string, academicYearId: string, classId: string): Promise<Schedule[]> {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        *,
        subjects(name, code),
        teachers(first_name, last_name)
      `)
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .eq('class_id', classId)
      .is('deleted_at', null)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Vérification basique des chevauchements pour un prof ou une classe
  static async checkOverlap(
    schoolId: string,
    academicYearId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    classId: string,
    teacherId: string,
    excludeScheduleId?: string
  ): Promise<{ hasOverlap: boolean; reason?: string }> {
    let query = supabase
      .from('schedules')
      .select('id, class_id, teacher_id')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .eq('day_of_week', dayOfWeek)
      .is('deleted_at', null)
      // Check time overlap: new_start < existing_end AND new_end > existing_start
      .lt('start_time', endTime)
      .gt('end_time', startTime)
      .or(`class_id.eq.${classId},teacher_id.eq.${teacherId}`);

    if (excludeScheduleId) {
      query = query.neq('id', excludeScheduleId);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      const conflict = data[0];
      if (conflict.class_id === classId) {
        return { hasOverlap: true, reason: 'La classe a déjà cours sur ce créneau.' };
      }
      if (conflict.teacher_id === teacherId) {
        return { hasOverlap: true, reason: 'Le professeur a déjà cours avec une autre classe sur ce créneau.' };
      }
    }

    return { hasOverlap: false };
  }

  static async createSchedule(payload: Partial<Schedule>): Promise<Schedule> {
    const { data, error } = await supabase
      .from('schedules')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateSchedule(id: string, payload: Partial<Schedule>): Promise<Schedule> {
    const { data, error } = await supabase
      .from('schedules')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteSchedule(id: string): Promise<void> {
    const { error } = await supabase
      .from('schedules')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }
}
