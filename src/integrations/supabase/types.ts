export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      academic_calendar: {
        Row: {
          academic_year: string
          created_at: string
          created_by: string
          exam_dates: Json
          id: string
          semester: string
          start_date: string
          total_weeks: number
          updated_at: string
        }
        Insert: {
          academic_year?: string
          created_at?: string
          created_by: string
          exam_dates?: Json
          id?: string
          semester?: string
          start_date: string
          total_weeks?: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          created_by?: string
          exam_dates?: Json
          id?: string
          semester?: string
          start_date?: string
          total_weeks?: number
          updated_at?: string
        }
        Relationships: []
      }
      activity_class_targets: {
        Row: {
          activity_id: string
          allow_student_uploads: boolean
          class_id: string
          id: string
        }
        Insert: {
          activity_id: string
          allow_student_uploads?: boolean
          class_id: string
          id?: string
        }
        Update: {
          activity_id?: string
          allow_student_uploads?: boolean
          class_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_class_targets_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "teacher_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_class_targets_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          target_class_ids: string[] | null
          target_type: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          target_class_ids?: string[] | null
          target_type?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          target_class_ids?: string[] | null
          target_type?: string
          title?: string
        }
        Relationships: []
      }
      attendance_backup: {
        Row: {
          class_id: string | null
          created_at: string | null
          date: string | null
          id: string | null
          notes: string | null
          organization_id: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string | null
          notes?: string | null
          organization_id?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string | null
          notes?: string | null
          organization_id?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          organization_id: string
          recorded_by: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          organization_id?: string
          recorded_by: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          organization_id?: string
          recorded_by?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_schedule_exceptions: {
        Row: {
          class_id: string
          created_at: string
          created_by: string
          id: string
          new_date: string | null
          original_date: string
          reason: string
          type: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by: string
          id?: string
          new_date?: string | null
          original_date: string
          reason?: string
          type?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string
          id?: string
          new_date?: string | null
          original_date?: string
          reason?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_schedule_exceptions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_backup: {
        Row: {
          class_id: string | null
          created_at: string | null
          date: string | null
          id: string | null
          note: string | null
          notified: boolean | null
          organization_id: string | null
          recorded_by: string | null
          student_id: string | null
          type: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string | null
          note?: string | null
          notified?: boolean | null
          organization_id?: string | null
          recorded_by?: string | null
          student_id?: string | null
          type?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string | null
          note?: string | null
          notified?: boolean | null
          organization_id?: string | null
          recorded_by?: string | null
          student_id?: string | null
          type?: string | null
        }
        Relationships: []
      }
      behavior_records: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          note: string | null
          notified: boolean
          organization_id: string
          recorded_by: string
          student_id: string
          type: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          notified?: boolean
          organization_id?: string
          recorded_by: string
          student_id: string
          type: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          notified?: boolean
          organization_id?: string
          recorded_by?: string
          student_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_records_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_feature_enrollments: {
        Row: {
          enabled: boolean
          enrolled_at: string
          enrolled_by: string | null
          feature_id: string
          id: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          enrolled_at?: string
          enrolled_by?: string | null
          feature_id: string
          id?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          enrolled_at?: string
          enrolled_by?: string | null
          feature_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_feature_enrollments_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "beta_features"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_feature_feedback: {
        Row: {
          created_at: string
          feature_id: string
          id: string
          message: string
          rating: number
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_id: string
          id?: string
          message?: string
          rating?: number
          user_id: string
        }
        Update: {
          created_at?: string
          feature_id?: string
          id?: string
          message?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_feature_feedback_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "beta_features"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_features: {
        Row: {
          created_at: string
          description: string
          feature_key: string
          icon: string
          id: string
          is_globally_enabled: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          feature_key: string
          icon?: string
          id?: string
          is_globally_enabled?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          feature_key?: string
          icon?: string
          id?: string
          is_globally_enabled?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_schedules: {
        Row: {
          class_id: string
          created_at: string
          days_of_week: number[]
          id: string
          periods_per_week: number
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          days_of_week?: number[]
          id?: string
          periods_per_week?: number
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          days_of_week?: number[]
          id?: string
          periods_per_week?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string
          created_at: string
          grade: string
          id: string
          name: string
          organization_id: string
          section: string
        }
        Insert: {
          academic_year?: string
          created_at?: string
          grade: string
          id?: string
          name: string
          organization_id?: string
          section: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          grade?: string
          id?: string
          name?: string
          organization_id?: string
          section?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      classes_backup: {
        Row: {
          academic_year: string | null
          created_at: string | null
          grade: string | null
          id: string | null
          name: string | null
          organization_id: string | null
          section: string | null
        }
        Insert: {
          academic_year?: string | null
          created_at?: string | null
          grade?: string | null
          id?: string | null
          name?: string | null
          organization_id?: string | null
          section?: string | null
        }
        Update: {
          academic_year?: string | null
          created_at?: string | null
          grade?: string | null
          id?: string | null
          name?: string | null
          organization_id?: string | null
          section?: string | null
        }
        Relationships: []
      }
      custom_form_sections: {
        Row: {
          color: string
          created_at: string
          created_by: string
          icon: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by: string
          icon?: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          icon?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      custom_form_templates: {
        Row: {
          body_template: string
          created_at: string
          created_by: string
          description: string
          fields: Json
          icon: string
          id: string
          include_auto_fields: boolean
          section_id: string
          signature_enabled: boolean
          signature_labels: Json
          sort_order: number
          title: string
        }
        Insert: {
          body_template?: string
          created_at?: string
          created_by: string
          description?: string
          fields?: Json
          icon?: string
          id?: string
          include_auto_fields?: boolean
          section_id: string
          signature_enabled?: boolean
          signature_labels?: Json
          sort_order?: number
          title: string
        }
        Update: {
          body_template?: string
          created_at?: string
          created_by?: string
          description?: string
          fields?: Json
          icon?: string
          id?: string
          include_auto_fields?: boolean
          section_id?: string
          signature_enabled?: boolean
          signature_labels?: Json
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_form_templates_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "custom_form_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      data_recovery_log: {
        Row: {
          action: string
          id: string
          new_value: Json | null
          old_value: Json | null
          ran_at: string
          ran_by: string | null
          record_id: string | null
          run_id: string
          source_table: string
        }
        Insert: {
          action: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          ran_at?: string
          ran_by?: string | null
          record_id?: string | null
          run_id: string
          source_table: string
        }
        Update: {
          action?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          ran_at?: string
          ran_by?: string | null
          record_id?: string | null
          run_id?: string
          source_table?: string
        }
        Relationships: []
      }
      excuse_submissions: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          notification_id: string
          reason: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          notification_id: string
          reason?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          notification_id?: string
          reason?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "excuse_submissions_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excuse_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excuse_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      form_favorites: {
        Row: {
          created_at: string
          form_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      form_issued_logs: {
        Row: {
          class_name: string
          field_values: Json
          form_id: string
          form_title: string
          id: string
          issued_at: string
          issued_by: string
          student_id: string
          student_name: string
        }
        Insert: {
          class_name?: string
          field_values?: Json
          form_id: string
          form_title: string
          id?: string
          issued_at?: string
          issued_by: string
          student_id: string
          student_name: string
        }
        Update: {
          class_name?: string
          field_values?: Json
          form_id?: string
          form_title?: string
          id?: string
          issued_at?: string
          issued_by?: string
          student_id?: string
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_issued_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_issued_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_categories: {
        Row: {
          category_group: string
          class_id: string | null
          created_at: string
          id: string
          is_deduction: boolean
          max_score: number
          name: string
          sort_order: number
          weight: number
        }
        Insert: {
          category_group?: string
          class_id?: string | null
          created_at?: string
          id?: string
          is_deduction?: boolean
          max_score?: number
          name: string
          sort_order?: number
          weight?: number
        }
        Update: {
          category_group?: string
          class_id?: string | null
          created_at?: string
          id?: string
          is_deduction?: boolean
          max_score?: number
          name?: string
          sort_order?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "grade_categories_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          category_id: string
          created_at: string
          date: string
          id: string
          note: string | null
          organization_id: string
          period: number
          recorded_by: string
          score: number | null
          student_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          organization_id?: string
          period?: number
          recorded_by: string
          score?: number | null
          student_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          organization_id?: string
          period?: number
          recorded_by?: string
          score?: number | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "grade_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      grades_backup: {
        Row: {
          category_id: string | null
          created_at: string | null
          date: string | null
          id: string | null
          note: string | null
          organization_id: string | null
          period: number | null
          recorded_by: string | null
          score: number | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string | null
          note?: string | null
          organization_id?: string | null
          period?: number | null
          recorded_by?: string | null
          score?: number | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string | null
          note?: string | null
          organization_id?: string | null
          period?: number | null
          recorded_by?: string | null
          score?: number | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invalid_records: {
        Row: {
          detected_at: string
          detected_by: string | null
          id: string
          payload: Json
          reason: string
          source_id: string | null
          source_table: string
        }
        Insert: {
          detected_at?: string
          detected_by?: string | null
          id?: string
          payload?: Json
          reason: string
          source_id?: string | null
          source_table: string
        }
        Update: {
          detected_at?: string
          detected_by?: string | null
          id?: string
          payload?: Json
          reason?: string
          source_id?: string | null
          source_table?: string
        }
        Relationships: []
      }
      lesson_plans: {
        Row: {
          class_id: string
          created_at: string
          created_by: string
          day_index: number
          id: string
          is_completed: boolean
          lesson_title: string
          objectives: string | null
          slot_index: number
          teacher_reflection: string | null
          updated_at: string
          week_number: number
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by: string
          day_index?: number
          id?: string
          is_completed?: boolean
          lesson_title?: string
          objectives?: string | null
          slot_index?: number
          teacher_reflection?: string | null
          updated_at?: string
          week_number: number
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string
          day_index?: number
          id?: string
          is_completed?: boolean
          lesson_title?: string
          objectives?: string | null
          slot_index?: number
          teacher_reflection?: string | null
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_category_scores: {
        Row: {
          category_id: string
          created_at: string
          id: string
          period: number
          recorded_by: string
          score: number
          student_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          period?: number
          recorded_by: string
          score?: number
          student_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          period?: number
          recorded_by?: string
          score?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_category_scores_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "grade_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_category_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_category_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_read: boolean
          message: string
          organization_id: string
          status: string
          student_id: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          message: string
          organization_id?: string
          status?: string
          student_id: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          message?: string
          organization_id?: string
          status?: string
          student_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_backup: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string | null
          is_read: boolean | null
          message: string | null
          organization_id: string | null
          status: string | null
          student_id: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_read?: boolean | null
          message?: string | null
          organization_id?: string | null
          status?: string | null
          student_id?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_read?: boolean | null
          message?: string | null
          organization_id?: string | null
          status?: string | null
          student_id?: string | null
          type?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          type: Database["public"]["Enums"]["organization_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          type: Database["public"]["Enums"]["organization_type"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          type?: Database["public"]["Enums"]["organization_type"]
        }
        Relationships: []
      }
      owner_activation_secret: {
        Row: {
          id: boolean
          key_hash: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          key_hash: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          key_hash?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      parent_messages: {
        Row: {
          body: string
          class_id: string | null
          created_at: string
          id: string
          message_type: string
          parent_name: string
          parent_phone: string | null
          replied_at: string | null
          replied_by: string | null
          status: string
          student_id: string
          subject: string
          teacher_reply: string | null
        }
        Insert: {
          body?: string
          class_id?: string | null
          created_at?: string
          id?: string
          message_type?: string
          parent_name?: string
          parent_phone?: string | null
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          student_id: string
          subject?: string
          teacher_reply?: string | null
        }
        Update: {
          body?: string
          class_id?: string | null
          created_at?: string
          id?: string
          message_type?: string
          parent_name?: string
          parent_phone?: string | null
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          student_id?: string
          subject?: string
          teacher_reply?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_messages_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_messages: {
        Row: {
          created_at: string
          created_by: string
          expiry: string | null
          id: string
          message: string
          target_class_ids: string[] | null
          target_type: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expiry?: string | null
          id?: string
          message: string
          target_class_ids?: string[] | null
          target_type?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expiry?: string | null
          id?: string
          message?: string
          target_class_ids?: string[] | null
          target_type?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          created_at: string
          full_name: string
          id: string
          national_id: string | null
          organization_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["org_role"] | null
          subscription_end: string | null
          subscription_plan: string
          subscription_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          full_name: string
          id?: string
          national_id?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["org_role"] | null
          subscription_end?: string | null
          subscription_plan?: string
          subscription_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          full_name?: string
          id?: string
          national_id?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["org_role"] | null
          subscription_end?: string | null
          subscription_plan?: string
          subscription_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          class_id: string | null
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          student_id: string | null
          user_type: string
        }
        Insert: {
          auth: string
          class_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          student_id?: string | null
          user_type?: string
        }
        Update: {
          auth?: string
          class_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          student_id?: string | null
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank_chapters: {
        Row: {
          created_at: string
          created_by: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      question_bank_lessons: {
        Row: {
          chapter_id: string
          created_at: string
          created_by: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          created_by: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          created_by?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_lessons_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "question_bank_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank_questions: {
        Row: {
          correct_index: number
          created_at: string
          created_by: string
          enabled: boolean
          id: string
          lesson_id: string
          options: Json
          question_text: string
          question_type: string
          score: number
        }
        Insert: {
          correct_index?: number
          created_at?: string
          created_by: string
          enabled?: boolean
          id?: string
          lesson_id: string
          options?: Json
          question_text: string
          question_type?: string
          score?: number
        }
        Update: {
          correct_index?: number
          created_at?: string
          created_by?: string
          enabled?: boolean
          id?: string
          lesson_id?: string
          options?: Json
          question_text?: string
          question_type?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "question_bank_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          activity_id: string
          correct_answer: number
          created_at: string
          id: string
          image_url: string | null
          options: Json
          question_text: string
          question_type: string
          sort_order: number
        }
        Insert: {
          activity_id: string
          correct_answer?: number
          created_at?: string
          id?: string
          image_url?: string | null
          options?: Json
          question_text: string
          question_type?: string
          sort_order?: number
        }
        Update: {
          activity_id?: string
          correct_answer?: number
          created_at?: string
          id?: string
          image_url?: string | null
          options?: Json
          question_text?: string
          question_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "teacher_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_submissions: {
        Row: {
          activity_id: string
          answers: Json
          id: string
          score: number | null
          student_id: string
          submitted_at: string
          total: number | null
        }
        Insert: {
          activity_id: string
          answers?: Json
          id?: string
          score?: number | null
          student_id: string
          submitted_at?: string
          total?: number | null
        }
        Update: {
          activity_id?: string
          answers?: Json
          id?: string
          score?: number | null
          student_id?: string
          submitted_at?: string
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_submissions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "teacher_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_action_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
        }
        Relationships: []
      }
      reports_backup: {
        Row: {
          can_export: boolean
          can_print: boolean
          class_ids: string[]
          created_at: string
          expires_at: string
          id: string
          label: string
          last_viewed_at: string | null
          teacher_id: string
          token: string
          view_count: number
        }
        Insert: {
          can_export?: boolean
          can_print?: boolean
          class_ids?: string[]
          created_at?: string
          expires_at?: string
          id?: string
          label?: string
          last_viewed_at?: string | null
          teacher_id: string
          token?: string
          view_count?: number
        }
        Update: {
          can_export?: boolean
          can_print?: boolean
          class_ids?: string[]
          created_at?: string
          expires_at?: string
          id?: string
          label?: string
          last_viewed_at?: string | null
          teacher_id?: string
          token?: string
          view_count?: number
        }
        Relationships: []
      }
      resource_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          folder_id: string
          id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          folder_id: string
          id?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          folder_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "resource_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_folders: {
        Row: {
          category: string
          class_id: string | null
          created_at: string
          created_by: string
          icon: string
          id: string
          title: string
          visible_to_students: boolean
        }
        Insert: {
          category?: string
          class_id?: string | null
          created_at?: string
          created_by: string
          icon?: string
          id?: string
          title: string
          visible_to_students?: boolean
        }
        Update: {
          category?: string
          class_id?: string | null
          created_at?: string
          created_by?: string
          icon?: string
          id?: string
          title?: string
          visible_to_students?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "resource_folders_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_views: {
        Row: {
          can_export: boolean
          can_print: boolean
          class_ids: string[]
          created_at: string
          expires_at: string
          id: string
          label: string
          last_viewed_at: string | null
          teacher_id: string
          token: string
          view_count: number
        }
        Insert: {
          can_export?: boolean
          can_print?: boolean
          class_ids?: string[]
          created_at?: string
          expires_at?: string
          id?: string
          label?: string
          last_viewed_at?: string | null
          teacher_id: string
          token?: string
          view_count?: number
        }
        Update: {
          can_export?: boolean
          can_print?: boolean
          class_ids?: string[]
          created_at?: string
          expires_at?: string
          id?: string
          label?: string
          last_viewed_at?: string | null
          teacher_id?: string
          token?: string
          view_count?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          updated_at: string
          value: string
        }
        Insert: {
          id: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      staff_logins: {
        Row: {
          id: string
          ip_address: string | null
          logged_in_at: string
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          logged_in_at?: string
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          logged_in_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_file_submissions: {
        Row: {
          activity_id: string
          class_id: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          student_id: string
          submitted_at: string
        }
        Insert: {
          activity_id: string
          class_id: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          student_id: string
          submitted_at?: string
        }
        Update: {
          activity_id?: string
          class_id?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_file_submissions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "teacher_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_file_submissions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_file_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_file_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      student_login_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip_address: string | null
          national_id: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip_address?: string | null
          national_id: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          id?: string
          ip_address?: string | null
          national_id?: string
          success?: boolean
        }
        Relationships: []
      }
      student_logins: {
        Row: {
          class_id: string | null
          id: string
          logged_in_at: string
          login_type: string
          student_id: string
        }
        Insert: {
          class_id?: string | null
          id?: string
          logged_in_at?: string
          login_type?: string
          student_id: string
        }
        Update: {
          class_id?: string | null
          id?: string
          logged_in_at?: string
          login_type?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_logins_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_logins_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_logins_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          academic_number: string | null
          class_id: string | null
          created_at: string
          full_name: string
          id: string
          national_id: string | null
          notes: string | null
          organization_id: string
          parent_phone: string | null
          updated_at: string
        }
        Insert: {
          academic_number?: string | null
          class_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          national_id?: string | null
          notes?: string | null
          organization_id?: string
          parent_phone?: string | null
          updated_at?: string
        }
        Update: {
          academic_number?: string | null
          class_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          national_id?: string | null
          notes?: string | null
          organization_id?: string
          parent_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      students_backup: {
        Row: {
          academic_number: string | null
          class_id: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          national_id: string | null
          notes: string | null
          organization_id: string | null
          parent_phone: string | null
          updated_at: string | null
        }
        Insert: {
          academic_number?: string | null
          class_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          national_id?: string | null
          notes?: string | null
          organization_id?: string | null
          parent_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_number?: string | null
          class_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          national_id?: string | null
          notes?: string | null
          organization_id?: string | null
          parent_phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      students_recovery_snapshots: {
        Row: {
          original_organization_id: string | null
          payload: Json
          snapshot_at: string
          snapshot_by: string | null
          snapshot_id: string
          student_id: string
        }
        Insert: {
          original_organization_id?: string | null
          payload: Json
          snapshot_at?: string
          snapshot_by?: string | null
          snapshot_id?: string
          student_id: string
        }
        Update: {
          original_organization_id?: string | null
          payload?: Json
          snapshot_at?: string
          snapshot_by?: string | null
          snapshot_id?: string
          student_id?: string
        }
        Relationships: []
      }
      system_repair_invalid: {
        Row: {
          flagged_at: string
          id: string
          payload: Json
          reason: string
          record_id: string | null
          table_name: string
        }
        Insert: {
          flagged_at?: string
          id?: string
          payload: Json
          reason: string
          record_id?: string | null
          table_name: string
        }
        Update: {
          flagged_at?: string
          id?: string
          payload?: Json
          reason?: string
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      system_repair_runs: {
        Row: {
          fixed_counts: Json
          id: string
          invalid_counts: Json
          notes: string | null
          ran_at: string
          ran_by: string | null
        }
        Insert: {
          fixed_counts?: Json
          id?: string
          invalid_counts?: Json
          notes?: string | null
          ran_at?: string
          ran_by?: string | null
        }
        Update: {
          fixed_counts?: Json
          id?: string
          invalid_counts?: Json
          notes?: string | null
          ran_at?: string
          ran_by?: string | null
        }
        Relationships: []
      }
      teacher_activities: {
        Row: {
          allow_student_uploads: boolean
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number | null
          file_name: string | null
          file_url: string | null
          id: string
          is_visible: boolean
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          allow_student_uploads?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_visible?: boolean
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          allow_student_uploads?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_visible?: boolean
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_classes: {
        Row: {
          class_id: string
          id: string
          subject: string | null
          teacher_id: string
        }
        Insert: {
          class_id: string
          id?: string
          subject?: string | null
          teacher_id: string
        }
        Update: {
          class_id?: string
          id?: string
          subject?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_permissions: {
        Row: {
          can_delete_records: boolean
          can_export: boolean
          can_manage_attendance: boolean
          can_manage_grades: boolean
          can_print: boolean
          can_send_notifications: boolean
          can_view_activities: boolean
          can_view_attendance: boolean
          can_view_dashboard: boolean
          can_view_grades: boolean
          can_view_reports: boolean
          can_view_students: boolean
          created_at: string
          id: string
          read_only_mode: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          can_delete_records?: boolean
          can_export?: boolean
          can_manage_attendance?: boolean
          can_manage_grades?: boolean
          can_print?: boolean
          can_send_notifications?: boolean
          can_view_activities?: boolean
          can_view_attendance?: boolean
          can_view_dashboard?: boolean
          can_view_grades?: boolean
          can_view_reports?: boolean
          can_view_students?: boolean
          created_at?: string
          id?: string
          read_only_mode?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          can_delete_records?: boolean
          can_export?: boolean
          can_manage_attendance?: boolean
          can_manage_grades?: boolean
          can_print?: boolean
          can_send_notifications?: boolean
          can_view_activities?: boolean
          can_view_attendance?: boolean
          can_view_dashboard?: boolean
          can_view_grades?: boolean
          can_view_reports?: boolean
          can_view_students?: boolean
          created_at?: string
          id?: string
          read_only_mode?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      timetable_slots: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          id: string
          period_number: number
          subject_name: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week?: number
          id?: string
          period_number?: number
          subject_name?: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          id?: string
          period_number?: number
          subject_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      quiz_questions_student: {
        Row: {
          activity_id: string | null
          id: string | null
          image_url: string | null
          options: Json | null
          question_text: string | null
          question_type: string | null
          sort_order: number | null
        }
        Insert: {
          activity_id?: string | null
          id?: string | null
          image_url?: string | null
          options?: Json | null
          question_text?: string | null
          question_type?: string | null
          sort_order?: number | null
        }
        Update: {
          activity_id?: string | null
          id?: string | null
          image_url?: string | null
          options?: Json | null
          question_text?: string | null
          question_type?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "teacher_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      students_safe: {
        Row: {
          academic_number: string | null
          class_id: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          national_id: string | null
          notes: string | null
          parent_phone: string | null
          updated_at: string | null
        }
        Insert: {
          academic_number?: never
          class_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          national_id?: never
          notes?: string | null
          parent_phone?: never
          updated_at?: string | null
        }
        Update: {
          academic_number?: never
          class_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          national_id?: never
          notes?: string | null
          parent_phone?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_teacher_write_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      get_user_national_id: { Args: { _user_id: string }; Returns: string }
      get_user_org: { Args: { _user_id: string }; Returns: string }
      get_user_org_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
      has_org_role: {
        Args: {
          _role: Database["public"]["Enums"]["org_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_owner_activation_key: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_caller_super_owner: { Args: never; Returns: boolean }
      is_primary_owner: { Args: { _user_id: string }; Returns: boolean }
      is_recovery_mode: { Args: never; Returns: boolean }
      is_subscriber: { Args: { _user_id: string }; Returns: boolean }
      is_subscription_active: { Args: { _user_id: string }; Returns: boolean }
      is_super_owner: { Args: { _user_id: string }; Returns: boolean }
      is_user_approved: { Args: { _user_id: string }; Returns: boolean }
      is_viewer: { Args: { _user_id: string }; Returns: boolean }
      is_viewer_for_class: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      recover_all_user_data: { Args: never; Returns: Json }
      recover_primary_owner: { Args: never; Returns: Json }
      resolve_default_org: { Args: never; Returns: string }
      restore_missing_students: { Args: never; Returns: Json }
      revoke_subscriber: { Args: { _target_user: string }; Returns: Json }
      run_full_system_audit: { Args: never; Returns: Json }
      run_system_repair: { Args: never; Returns: Json }
      same_org_as_class: { Args: { _class_id: string }; Returns: boolean }
      same_org_as_creator: { Args: { _creator_id: string }; Returns: boolean }
      set_owner_activation_key: {
        Args: { _new_key: string }
        Returns: undefined
      }
      set_user_approval: {
        Args: {
          _status: Database["public"]["Enums"]["approval_status"]
          _target_user: string
        }
        Returns: Json
      }
      set_user_subscription: {
        Args: {
          _end: string
          _plan: string
          _start: string
          _target_user: string
        }
        Returns: Json
      }
      teacher_can_view_student_in_class: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      teacher_can_view_students: {
        Args: { _user_id: string }
        Returns: boolean
      }
      teacher_owns_all_classes: {
        Args: { _class_ids: string[]; _teacher_id: string }
        Returns: boolean
      }
      teacher_teaches_class: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      teacher_teaches_student: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_org_role_in: {
        Args: {
          _roles: Database["public"]["Enums"]["org_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      verify_owner_activation_key: {
        Args: { _candidate: string }
        Returns: boolean
      }
      verify_tenant_isolation: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "teacher"
      approval_status: "pending" | "approved" | "rejected"
      attendance_status:
        | "present"
        | "absent"
        | "late"
        | "early_leave"
        | "sick_leave"
      org_role: "owner" | "admin" | "teacher" | "student" | "parent"
      organization_type: "school" | "individual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher"],
      approval_status: ["pending", "approved", "rejected"],
      attendance_status: [
        "present",
        "absent",
        "late",
        "early_leave",
        "sick_leave",
      ],
      org_role: ["owner", "admin", "teacher", "student", "parent"],
      organization_type: ["school", "individual"],
    },
  },
} as const
