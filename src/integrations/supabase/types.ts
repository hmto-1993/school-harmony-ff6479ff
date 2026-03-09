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
      attendance_records: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
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
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
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
      behavior_records: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          note: string | null
          notified: boolean
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
            foreignKeyName: "behavior_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
          section: string
        }
        Insert: {
          academic_year?: string
          created_at?: string
          grade: string
          id?: string
          name: string
          section: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          grade?: string
          id?: string
          name?: string
          section?: string
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
        ]
      }
      grade_categories: {
        Row: {
          category_group: string
          class_id: string | null
          created_at: string
          id: string
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
          id: string
          period: number
          recorded_by: string
          score: number | null
          student_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          period?: number
          recorded_by: string
          score?: number | null
          student_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
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
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_read: boolean
          message: string
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
          status?: string
          student_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
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
          created_at: string
          full_name: string
          id: string
          national_id: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          national_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          national_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
        ]
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
        ]
      }
      student_logins: {
        Row: {
          class_id: string | null
          id: string
          logged_in_at: string
          student_id: string
        }
        Insert: {
          class_id?: string | null
          id?: string
          logged_in_at?: string
          student_id: string
        }
        Update: {
          class_id?: string | null
          id?: string
          logged_in_at?: string
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
        ]
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher"
      attendance_status:
        | "present"
        | "absent"
        | "late"
        | "early_leave"
        | "sick_leave"
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
      attendance_status: [
        "present",
        "absent",
        "late",
        "early_leave",
        "sick_leave",
      ],
    },
  },
} as const
