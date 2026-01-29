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
    public: {
        Tables: {
            accounts: {
                Row: {
                    balance: number | null
                    color: string | null
                    created_at: string
                    deleted_at: string | null
                    icon: string | null
                    id: string
                    name: string
                    type: Database["public"]["Enums"]["account_type"]
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    balance?: number | null
                    color?: string | null
                    created_at?: string
                    deleted_at?: string | null
                    icon?: string | null
                    id?: string
                    name: string
                    type: Database["public"]["Enums"]["account_type"]
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    balance?: number | null
                    color?: string | null
                    created_at?: string
                    deleted_at?: string | null
                    icon?: string | null
                    id?: string
                    name?: string
                    type?: Database["public"]["Enums"]["account_type"]
                    updated_at?: string
                    user_id?: string
                }
                Relationships: []
            }
            categories: {
                Row: {
                    color: string | null
                    created_at: string
                    deleted_at: string | null
                    icon: string | null
                    id: string
                    name: string
                    name_en: string | null
                    parent_id: string | null
                    type: Database["public"]["Enums"]["category_type"]
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    color?: string | null
                    created_at?: string
                    deleted_at?: string | null
                    icon?: string | null
                    id?: string
                    name: string
                    name_en?: string | null
                    parent_id?: string | null
                    type: Database["public"]["Enums"]["category_type"]
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    color?: string | null
                    created_at?: string
                    deleted_at?: string | null
                    icon?: string | null
                    id?: string
                    name?: string
                    name_en?: string | null
                    parent_id?: string | null
                    type?: Database["public"]["Enums"]["category_type"]
                    updated_at?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "categories_parent_id_fkey"
                        columns: ["parent_id"]
                        referencedRelation: "categories"
                        referencedColumns: ["id"]
                    }
                ]
            }
            profiles: {
                Row: {
                    currency: string | null
                    id: string
                    language: string | null
                    theme: string | null
                    updated_at: string | null
                }
                Insert: {
                    currency?: string | null
                    id: string
                    language?: string | null
                    theme?: string | null
                    updated_at?: string | null
                }
                Update: {
                    currency?: string | null
                    id?: string
                    language?: string | null
                    theme?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_id_fkey"
                        columns: ["id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            transactions: {
                Row: {
                    account_id: string
                    amount: number
                    category_id: string | null
                    created_at: string
                    date: string
                    description: string | null
                    id: string
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    account_id: string
                    amount: number
                    category_id?: string | null
                    created_at?: string
                    date: string
                    description?: string | null
                    id?: string
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    account_id?: string
                    amount?: number
                    category_id?: string | null
                    created_at?: string
                    date?: string
                    description?: string | null
                    id?: string
                    updated_at?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "transactions_account_id_fkey"
                        columns: ["account_id"]
                        referencedRelation: "accounts"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "transactions_category_id_fkey"
                        columns: ["category_id"]
                        referencedRelation: "categories"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            account_type: "cash" | "bank" | "credit" | "investment" | "other"
            category_type: "income" | "expense" | "transfer"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// Helper types simplified for public schema usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
