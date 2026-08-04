import { definitions } from './database.types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TablesMap = {
  [TableName in keyof definitions]: {
    Row: definitions[TableName];
    Insert: Partial<definitions[TableName]>;
    Update: Partial<definitions[TableName]>;
  };
};

export interface Database {
  public: {
    Tables: TablesMap;
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
