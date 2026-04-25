/**
 * database.types.ts
 * Typed schema for all Supabase tables.
 * Run `npx supabase gen types typescript` to regenerate after schema changes.
 */

export type UserRole = "admin" | "client";
export type SiteStatus = "active" | "suspended" | "pending" | "cancelled";
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "cancelled"
  | "incomplete";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          company_name: string | null;
          phone: string | null;
          address_line1: string | null;
          address_line2: string | null;
          suburb: string | null;
          state: string | null;
          postcode: string | null;
          country: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          company_name?: string | null;
          phone?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          suburb?: string | null;
          state?: string | null;
          postcode?: string | null;
          country?: string;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          company_name?: string | null;
          phone?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          suburb?: string | null;
          state?: string | null;
          postcode?: string | null;
          country?: string;
        };
      };
      sites: {
        Row: {
          id: string;
          owner_id: string;
          domain: string;
          status: SiteStatus;
          plan_name: string | null;
          renewal_date: string | null;
          hosting_username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          domain: string;
          status?: SiteStatus;
          plan_name?: string | null;
          renewal_date?: string | null;
          hosting_username?: string | null;
        };
        Update: {
          domain?: string;
          status?: SiteStatus;
          plan_name?: string | null;
          renewal_date?: string | null;
          hosting_username?: string | null;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          owner_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          plan_name: string | null;
          status: SubscriptionStatus;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          amount_aud: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          plan_name?: string | null;
          status?: SubscriptionStatus;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          amount_aud?: number | null;
        };
        Update: {
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          plan_name?: string | null;
          status?: SubscriptionStatus;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          amount_aud?: number | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
