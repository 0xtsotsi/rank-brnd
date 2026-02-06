/**
 * Supabase Database Types
 *
 * This file contains TypeScript types for the Supabase database.
 * These types should be generated using the Supabase CLI:
 *   pnpm supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
 *
 * For now, we provide a placeholder structure that matches Supabase's expected format.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Database type definition
 *
 * This is a placeholder that should be replaced with generated types
 * from your actual Supabase project.
 */
export interface Database {
  public: {
    Tables: {
      /**
       * Users table
       * User profiles synced with Clerk, linked to organizations
       */
      users: {
        Row: {
          id: string;
          clerk_id: string;
          organization_id: string | null;
          email: string;
          name: string;
          avatar_url: string | null;
          role: 'owner' | 'admin' | 'member' | 'viewer';
          preferences: Json;
          last_login: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_id: string;
          organization_id?: string | null;
          email: string;
          name: string;
          avatar_url?: string | null;
          role?: 'owner' | 'admin' | 'member' | 'viewer';
          preferences?: Json;
          last_login?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_id?: string;
          organization_id?: string | null;
          email?: string;
          name?: string;
          avatar_url?: string | null;
          role?: 'owner' | 'admin' | 'member' | 'viewer';
          preferences?: Json;
          last_login?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };

      /**
       * Subscriptions table
       * Stores Stripe subscription data for each organization
       */
      subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          stripe_subscription_id: string;
          stripe_customer_id: string;
          stripe_price_id: string;
          stripe_product_id: string;
          status:
            | 'active'
            | 'trialing'
            | 'past_due'
            | 'canceled'
            | 'unpaid'
            | 'incomplete';
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          trial_start: string | null;
          trial_end: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          stripe_subscription_id: string;
          stripe_customer_id: string;
          stripe_price_id: string;
          stripe_product_id: string;
          status:
            | 'active'
            | 'trialing'
            | 'past_due'
            | 'canceled'
            | 'unpaid'
            | 'incomplete';
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          canceled_at?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          stripe_subscription_id?: string;
          stripe_customer_id?: string;
          stripe_price_id?: string;
          stripe_product_id?: string;
          status?:
            | 'active'
            | 'trialing'
            | 'past_due'
            | 'canceled'
            | 'unpaid'
            | 'incomplete';
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
          metadata?: Json | null;
          updated_at?: string;
        };
      };

      /**
       * Invoices table
       * Stores invoice/payment history for subscriptions
       */
      invoices: {
        Row: {
          id: string;
          organization_id: string;
          subscription_id: string;
          stripe_invoice_id: string;
          amount_paid: number;
          currency: string;
          status: 'paid' | 'open' | 'void' | 'uncollectible' | 'deleted';
          invoice_pdf: string | null;
          hosted_invoice_url: string | null;
          due_date: string | null;
          paid_at: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          subscription_id: string;
          stripe_invoice_id: string;
          amount_paid: number;
          currency: string;
          status: 'paid' | 'open' | 'void' | 'uncollectible' | 'deleted';
          invoice_pdf?: string | null;
          hosted_invoice_url?: string | null;
          due_date?: string | null;
          paid_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          subscription_id?: string;
          stripe_invoice_id?: string;
          amount_paid?: number;
          currency?: string;
          status?: 'paid' | 'open' | 'void' | 'uncollectible' | 'deleted';
          invoice_pdf?: string | null;
          hosted_invoice_url?: string | null;
          due_date?: string | null;
          paid_at?: string | null;
          metadata?: Json | null;
        };
      };

      /**
       * Organizations table
       * Multi-tenant organizations with tier, settings, and Stripe integration
       */
      organizations: {
        Row: {
          id: string;
          clerk_id: string | null;
          name: string;
          slug: string;
          image_url: string | null;
          stripe_customer_id: string | null;
          tier: 'free' | 'starter' | 'pro' | 'agency';
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_id?: string | null;
          name: string;
          slug: string;
          image_url?: string | null;
          stripe_customer_id?: string | null;
          tier?: 'free' | 'starter' | 'pro' | 'agency';
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_id?: string | null;
          name?: string;
          slug?: string;
          image_url?: string | null;
          stripe_customer_id?: string | null;
          tier?: 'free' | 'starter' | 'pro' | 'agency';
          settings?: Json;
          updated_at?: string;
        };
      };

      /**
       * Organization members table
       * Junction table linking users to organizations with roles for multi-tenancy
       */
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member' | 'viewer';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'member' | 'viewer';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'member' | 'viewer';
          updated_at?: string;
        };
      };

      /**
       * Team members table
       * Enhanced organization membership with invitation workflow and extended roles (owner/admin/editor/viewer)
       */
      team_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'editor' | 'viewer';
          invited_at: string;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'editor' | 'viewer';
          invited_at?: string;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'editor' | 'viewer';
          invited_at?: string;
          accepted_at?: string | null;
          updated_at?: string;
        };
      };

      /**
       * Team invitations table
       * Email-based invitations with secure tokens for joining organizations
       */
      team_invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: 'owner' | 'admin' | 'editor' | 'viewer';
          token: string;
          invited_by_user_id: string;
          status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          role?: 'owner' | 'admin' | 'editor' | 'viewer';
          token: string;
          invited_by_user_id: string;
          status?:
            | 'pending'
            | 'accepted'
            | 'declined'
            | 'expired'
            | 'cancelled';
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          role?: 'owner' | 'admin' | 'editor' | 'viewer';
          token?: string;
          invited_by_user_id?: string;
          status?:
            | 'pending'
            | 'accepted'
            | 'declined'
            | 'expired'
            | 'cancelled';
          expires_at?: string;
          accepted_at?: string | null;
          updated_at?: string;
        };
      };

      /**
       * Products table
       * Stores products/websites owned by organizations with brand colors, tone preferences, and analytics config
       */
      products: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          url: string | null;
          description: string | null;
          status: 'active' | 'archived' | 'pending';
          brand_colors: Json;
          tone_preferences: Json;
          analytics_config: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          url?: string | null;
          description?: string | null;
          status?: 'active' | 'archived' | 'pending';
          brand_colors?: Json;
          tone_preferences?: Json;
          analytics_config?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          slug?: string;
          url?: string | null;
          description?: string | null;
          status?: 'active' | 'archived' | 'pending';
          brand_colors?: Json;
          tone_preferences?: Json;
          analytics_config?: Json;
          metadata?: Json;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };

      /**
       * Keywords table
       * SEO keywords tracked by organizations for their products
       */
      keywords: {
        Row: {
          id: string;
          organization_id: string;
          product_id: string | null;
          keyword: string;
          search_volume: number;
          difficulty: 'very-easy' | 'easy' | 'medium' | 'hard' | 'very-hard';
          intent:
            | 'informational'
            | 'navigational'
            | 'transactional'
            | 'commercial';
          opportunity_score: number;
          status: 'tracking' | 'paused' | 'opportunity' | 'ignored';
          current_rank: number | null;
          target_url: string | null;
          cpc: number | null;
          competition: number | null;
          notes: string | null;
          tags: string[];
          metadata: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id?: string | null;
          keyword: string;
          search_volume?: number;
          difficulty?: 'very-easy' | 'easy' | 'medium' | 'hard' | 'very-hard';
          intent?:
            | 'informational'
            | 'navigational'
            | 'transactional'
            | 'commercial';
          opportunity_score?: number;
          status?: 'tracking' | 'paused' | 'opportunity' | 'ignored';
          current_rank?: number | null;
          target_url?: string | null;
          cpc?: number | null;
          competition?: number | null;
          notes?: string | null;
          tags?: string[];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          product_id?: string | null;
          keyword?: string;
          search_volume?: number;
          difficulty?: 'very-easy' | 'easy' | 'medium' | 'hard' | 'very-hard';
          intent?:
            | 'informational'
            | 'navigational'
            | 'transactional'
            | 'commercial';
          opportunity_score?: number;
          status?: 'tracking' | 'paused' | 'opportunity' | 'ignored';
          current_rank?: number | null;
          target_url?: string | null;
          cpc?: number | null;
          competition?: number | null;
          notes?: string | null;
          tags?: string[];
          metadata?: Json;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };

      /**
       * SERP Analyses table
       * Stores SERP analysis results with competitor URLs, top 10 results, and content gaps
       */
      serp_analyses: {
        Row: {
          id: string;
          organization_id: string;
          product_id: string | null;
          keyword_id: string;
          query: string;
          device: string;
          location: string;
          competitor_urls: string[];
          competitor_domains: string[];
          top_10_results: Json;
          gaps: Json;
          serp_features: Json;
          search_volume: number;
          difficulty_score: number | null;
          opportunity_score: number | null;
          status: 'pending' | 'analyzing' | 'completed' | 'failed';
          error_message: string | null;
          recommendations: Json;
          analyzed_at: string | null;
          created_at: string;
          updated_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id?: string | null;
          keyword_id: string;
          query: string;
          device?: string;
          location?: string;
          competitor_urls?: string[];
          competitor_domains?: string[];
          top_10_results?: Json;
          gaps?: Json;
          serp_features?: Json;
          search_volume?: number;
          difficulty_score?: number | null;
          opportunity_score?: number | null;
          status?: 'pending' | 'analyzing' | 'completed' | 'failed';
          error_message?: string | null;
          recommendations?: Json;
          analyzed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          organization_id?: string;
          product_id?: string | null;
          keyword_id?: string;
          query?: string;
          device?: string;
          location?: string;
          competitor_urls?: string[];
          competitor_domains?: string[];
          top_10_results?: Json;
          gaps?: Json;
          serp_features?: Json;
          search_volume?: number;
          difficulty_score?: number | null;
          opportunity_score?: number | null;
          status?: 'pending' | 'analyzing' | 'completed' | 'failed';
          error_message?: string | null;
          recommendations?: Json;
          analyzed_at?: string | null;
          updated_at?: string;
          metadata?: Json;
        };
      };

      /**
       * Activity Logs table
       * Tracks user actions across resources within organizations
       */
      activity_logs: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          action: 'create' | 'update' | 'delete' | 'publish';
          resource_type: string;
          resource_id: string;
          metadata: Json | null;
          timestamp: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          action: 'create' | 'update' | 'delete' | 'publish';
          resource_type: string;
          resource_id: string;
          metadata?: Json | null;
          timestamp?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          action?: 'create' | 'update' | 'delete' | 'publish';
          resource_type?: string;
          resource_id?: string;
          metadata?: Json | null;
          timestamp?: string;
          updated_at?: string;
        };
      };

      /**
       * Backlinks table
       * Inbound links tracked by organizations for their products and articles
       */
      backlinks: {
        Row: {
          id: string;
          organization_id: string;
          product_id: string | null;
          article_id: string | null;
          source_url: string;
          target_url: string;
          domain_authority: number | null;
          page_authority: number | null;
          spam_score: number | null;
          link_type: 'dofollow' | 'nofollow' | 'sponsored' | 'ugc' | null;
          anchor_text: string | null;
          first_seen_at: string;
          last_verified_at: string | null;
          lost_at: string | null;
          status: 'pending' | 'active' | 'lost' | 'disavowed' | 'spam';
          notes: string | null;
          tags: string[];
          metadata: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id?: string | null;
          article_id?: string | null;
          source_url: string;
          target_url: string;
          domain_authority?: number | null;
          page_authority?: number | null;
          spam_score?: number | null;
          link_type?: 'dofollow' | 'nofollow' | 'sponsored' | 'ugc' | null;
          anchor_text?: string | null;
          first_seen_at?: string;
          last_verified_at?: string | null;
          lost_at?: string | null;
          status?: 'pending' | 'active' | 'lost' | 'disavowed' | 'spam';
          notes?: string | null;
          tags?: string[];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          product_id?: string | null;
          article_id?: string | null;
          source_url?: string;
          target_url?: string;
          domain_authority?: number | null;
          page_authority?: number | null;
          spam_score?: number | null;
          link_type?: 'dofollow' | 'nofollow' | 'sponsored' | 'ugc' | null;
          anchor_text?: string | null;
          first_seen_at?: string;
          last_verified_at?: string | null;
          lost_at?: string | null;
          status?: 'pending' | 'active' | 'lost' | 'disavowed' | 'spam';
          notes?: string | null;
          tags?: string[];
          metadata?: Json;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };

      /**
       * Exchange Network table
       * Partner sites in the exchange network for link building
       */
      exchange_network: {
        Row: {
          id: string;
          organization_id: string;
          product_id: string | null;
          site_id: string | null;
          domain: string;
          authority: number | null;
          niche: string | null;
          credits_available: number;
          quality_score: number | null;
          spam_score: number | null;
          status: 'active' | 'inactive' | 'pending' | 'suspended';
          contact_email: string | null;
          contact_name: string | null;
          notes: string | null;
          tags: string[];
          metadata: Json;
          last_verified_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id?: string | null;
          site_id?: string | null;
          domain: string;
          authority?: number | null;
          niche?: string | null;
          credits_available?: number;
          quality_score?: number | null;
          spam_score?: number | null;
          status?: 'active' | 'inactive' | 'pending' | 'suspended';
          contact_email?: string | null;
          contact_name?: string | null;
          notes?: string | null;
          tags?: string[];
          metadata?: Json;
          last_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          product_id?: string | null;
          site_id?: string | null;
          domain?: string;
          authority?: number | null;
          niche?: string | null;
          credits_available?: number;
          quality_score?: number | null;
          spam_score?: number | null;
          status?: 'active' | 'inactive' | 'pending' | 'suspended';
          contact_email?: string | null;
          contact_name?: string | null;
          notes?: string | null;
          tags?: string[];
          metadata?: Json;
          last_verified_at?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };

      /**
       * Exchange Matches table
       * Tracks exchange matches between organizations/products and exchange sites
       */
      exchange_matches: {
        Row: {
          id: string;
          organization_id: string;
          product_id: string | null;
          exchange_site_id: string;
          status:
            | 'pending'
            | 'approved'
            | 'published'
            | 'rejected'
            | 'cancelled';
          credits_used: number;
          target_url: string | null;
          anchor_text: string | null;
          content_title: string | null;
          content_id: string | null;
          notes: string | null;
          metadata: Json;
          requested_at: string;
          approved_at: string | null;
          published_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id?: string | null;
          exchange_site_id: string;
          status?:
            | 'pending'
            | 'approved'
            | 'published'
            | 'rejected'
            | 'cancelled';
          credits_used?: number;
          target_url?: string | null;
          anchor_text?: string | null;
          content_title?: string | null;
          content_id?: string | null;
          notes?: string | null;
          metadata?: Json;
          requested_at?: string;
          approved_at?: string | null;
          published_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          product_id?: string | null;
          exchange_site_id?: string;
          status?:
            | 'pending'
            | 'approved'
            | 'published'
            | 'rejected'
            | 'cancelled';
          credits_used?: number;
          target_url?: string | null;
          anchor_text?: string | null;
          content_title?: string | null;
          content_id?: string | null;
          notes?: string | null;
          metadata?: Json;
          requested_at?: string;
          approved_at?: string | null;
          published_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };

      /**
       * External Link Sources table
       * Authoritative external sources for citations and external linking
       */
      external_link_sources: {
        Row: {
          id: string;
          domain: string;
          name: string;
          url: string | null;
          description: string | null;
          category:
            | 'academic'
            | 'government'
            | 'industry'
            | 'news'
            | 'reference'
            | 'statistics'
            | 'health'
            | 'technology'
            | 'business'
            | 'other';
          status: 'active' | 'inactive' | 'pending' | 'deprecated';
          domain_authority: number | null;
          page_authority: number | null;
          spam_score: number | null;
          trustworthiness_score: number | null;
          is_global: boolean;
          organization_id: string | null;
          topics: string[];
          language: string;
          last_verified_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          domain: string;
          name: string;
          url?: string | null;
          description?: string | null;
          category?:
            | 'academic'
            | 'government'
            | 'industry'
            | 'news'
            | 'reference'
            | 'statistics'
            | 'health'
            | 'technology'
            | 'business'
            | 'other';
          status?: 'active' | 'inactive' | 'pending' | 'deprecated';
          domain_authority?: number | null;
          page_authority?: number | null;
          spam_score?: number | null;
          trustworthiness_score?: number | null;
          is_global?: boolean;
          organization_id?: string | null;
          topics?: string[];
          language?: string;
          last_verified_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          domain?: string;
          name?: string;
          url?: string | null;
          description?: string | null;
          category?:
            | 'academic'
            | 'government'
            | 'industry'
            | 'news'
            | 'reference'
            | 'statistics'
            | 'health'
            | 'technology'
            | 'business'
            | 'other';
          status?: 'active' | 'inactive' | 'pending' | 'deprecated';
          domain_authority?: number | null;
          page_authority?: number | null;
          spam_score?: number | null;
          trustworthiness_score?: number | null;
          is_global?: boolean;
          organization_id?: string | null;
          topics?: string[];
          language?: string;
          last_verified_at?: string | null;
          metadata?: Json;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };

      /**
       * External Link Opportunities table
       * Suggested external link opportunities for articles based on content analysis
       */
      external_link_opportunities: {
        Row: {
          id: string;
          organization_id: string;
          product_id: string | null;
          article_id: string | null;
          external_source_id: string | null;
          keyword: string | null;
          suggested_url: string | null;
          suggested_anchor_text: string | null;
          context_snippet: string | null;
          position_in_content: number | null;
          relevance_score: number | null;
          status: 'pending' | 'approved' | 'rejected' | 'applied';
          link_type: string;
          notes: string | null;
          metadata: Json;
          suggested_at: string;
          approved_at: string | null;
          applied_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id?: string | null;
          article_id?: string | null;
          external_source_id?: string | null;
          keyword?: string | null;
          suggested_url?: string | null;
          suggested_anchor_text?: string | null;
          context_snippet?: string | null;
          position_in_content?: number | null;
          relevance_score?: number | null;
          status?: 'pending' | 'approved' | 'rejected' | 'applied';
          link_type?: string;
          notes?: string | null;
          metadata?: Json;
          suggested_at?: string;
          approved_at?: string | null;
          applied_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          product_id?: string | null;
          article_id?: string | null;
          external_source_id?: string | null;
          keyword?: string | null;
          suggested_url?: string | null;
          suggested_anchor_text?: string | null;
          context_snippet?: string | null;
          position_in_content?: number | null;
          relevance_score?: number | null;
          status?: 'pending' | 'approved' | 'rejected' | 'applied';
          link_type?: string;
          notes?: string | null;
          metadata?: Json;
          suggested_at?: string;
          approved_at?: string | null;
          applied_at?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };

      /**
       * Data Exports table
       * GDPR data export requests for organizations with tracking and file storage
       */
      data_exports: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
          format: 'json' | 'csv';
          file_url: string | null;
          file_size_bytes: number | null;
          record_count: number;
          requested_tables: string[];
          include_deleted: boolean;
          error_message: string | null;
          expires_at: string;
          completed_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          status?:
            | 'pending'
            | 'processing'
            | 'completed'
            | 'failed'
            | 'expired';
          format: 'json' | 'csv';
          file_url?: string | null;
          file_size_bytes?: number | null;
          record_count?: number;
          requested_tables?: string[];
          include_deleted?: boolean;
          error_message?: string | null;
          expires_at?: string;
          completed_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          status?:
            | 'pending'
            | 'processing'
            | 'completed'
            | 'failed'
            | 'expired';
          format?: 'json' | 'csv';
          file_url?: string | null;
          file_size_bytes?: number | null;
          record_count?: number;
          requested_tables?: string[];
          include_deleted?: boolean;
          error_message?: string | null;
          expires_at?: string;
          completed_at?: string | null;
          metadata?: Json;
          updated_at?: string;
        };
      };

      /**
       * Webhooks table
       * Stores webhook configurations for organizations
       */
      webhooks: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          url: string;
          event_types: (
            | 'article.published'
            | 'article.updated'
            | 'article.deleted'
            | 'article.created'
            | 'keyword.ranking_changed'
            | 'backlink.status_changed'
            | 'subscription.updated'
            | 'organization.updated'
          )[];
          secret: string;
          status: 'active' | 'paused' | 'disabled';
          headers: Record<string, string>;
          metadata: Json;
          last_triggered_at: string | null;
          last_success_at: string | null;
          last_failure_at: string | null;
          failure_count: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          url: string;
          event_types: (
            | 'article.published'
            | 'article.updated'
            | 'article.deleted'
            | 'article.created'
            | 'keyword.ranking_changed'
            | 'backlink.status_changed'
            | 'subscription.updated'
            | 'organization.updated'
          )[];
          secret: string;
          status?: 'active' | 'paused' | 'disabled';
          headers?: Record<string, string>;
          metadata?: Json;
          last_triggered_at?: string | null;
          last_success_at?: string | null;
          last_failure_at?: string | null;
          failure_count?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          url?: string;
          event_types?: (
            | 'article.published'
            | 'article.updated'
            | 'article.deleted'
            | 'article.created'
            | 'keyword.ranking_changed'
            | 'backlink.status_changed'
            | 'subscription.updated'
            | 'organization.updated'
          )[];
          secret?: string;
          status?: 'active' | 'paused' | 'disabled';
          headers?: Record<string, string>;
          metadata?: Json;
          last_triggered_at?: string | null;
          last_success_at?: string | null;
          last_failure_at?: string | null;
          failure_count?: number;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };

      /**
       * Webhook Delivery Logs table
       * Tracks webhook delivery attempts and results
       */
      webhook_delivery_logs: {
        Row: {
          id: string;
          webhook_id: string;
          event_type:
            | 'article.published'
            | 'article.updated'
            | 'article.deleted'
            | 'article.created'
            | 'keyword.ranking_changed'
            | 'backlink.status_changed'
            | 'subscription.updated'
            | 'organization.updated';
          payload: Json;
          response_status: number | null;
          response_body: string | null;
          duration_ms: number | null;
          success: boolean;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          webhook_id: string;
          event_type:
            | 'article.published'
            | 'article.updated'
            | 'article.deleted'
            | 'article.created'
            | 'keyword.ranking_changed'
            | 'backlink.status_changed'
            | 'subscription.updated'
            | 'organization.updated';
          payload: Json;
          response_status?: number | null;
          response_body?: string | null;
          duration_ms?: number | null;
          success: boolean;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          webhook_id?: string;
          event_type?:
            | 'article.published'
            | 'article.updated'
            | 'article.deleted'
            | 'article.created'
            | 'keyword.ranking_changed'
            | 'backlink.status_changed'
            | 'subscription.updated'
            | 'organization.updated';
          payload?: Json;
          response_status?: number | null;
          response_body?: string | null;
          duration_ms?: number | null;
          success?: boolean;
          error_message?: string | null;
        };
      };
    };
    Views: {
      // Placeholder for view definitions
    };
    Functions: {
      get_user_by_clerk_id: {
        Args: {
          p_clerk_id: string;
        };
        Returns: {
          id: string;
          clerk_id: string;
          organization_id: string | null;
          email: string;
          name: string;
          avatar_url: string | null;
          role: 'owner' | 'admin' | 'member' | 'viewer';
          is_active: boolean;
          last_login: string | null;
        } | null;
      };
      get_organization_users: {
        Args: {
          p_organization_id: string;
        };
        Returns: {
          id: string;
          clerk_id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          role: 'owner' | 'admin' | 'member' | 'viewer';
          is_active: boolean;
          last_login: string | null;
        }[];
      };
      is_user_in_organization: {
        Args: {
          p_user_id: string;
          p_organization_id: string;
        };
        Returns: boolean;
      };
      get_user_organizations: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          id: string;
          name: string;
          slug: string;
          tier: 'free' | 'starter' | 'pro' | 'agency';
          role: 'owner' | 'admin' | 'member' | 'viewer';
        }[];
      };
      is_organization_member: {
        Args: {
          p_org_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      get_organization_role: {
        Args: {
          p_org_id: string;
          p_user_id: string;
        };
        Returns: 'owner' | 'admin' | 'member' | 'viewer' | null;
      };
      can_access_product: {
        Args: {
          p_product_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      soft_delete_product: {
        Args: {
          p_product_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      get_organization_products: {
        Args: {
          p_org_id: string;
          p_include_deleted?: boolean;
        };
        Returns: {
          id: string;
          name: string;
          slug: string;
          url: string | null;
          status: 'active' | 'archived' | 'pending';
          brand_colors: Json;
          tone_preferences: Json;
          analytics_config: Json;
          created_at: string;
          updated_at: string;
        }[];
      };

      // Keywords helper functions
      soft_delete_keyword: {
        Args: {
          p_keyword_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      get_organization_keywords: {
        Args: {
          p_org_id: string;
          p_include_deleted?: boolean;
          p_product_id?: string;
        };
        Returns: {
          id: string;
          keyword: string;
          search_volume: number;
          difficulty: 'very-easy' | 'easy' | 'medium' | 'hard' | 'very-hard';
          intent:
            | 'informational'
            | 'navigational'
            | 'transactional'
            | 'commercial';
          opportunity_score: number;
          status: 'tracking' | 'paused' | 'opportunity' | 'ignored';
          current_rank: number | null;
          target_url: string | null;
          cpc: number | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        }[];
      };
      get_product_keywords: {
        Args: {
          p_product_id: string;
          p_include_deleted?: boolean;
        };
        Returns: {
          id: string;
          keyword: string;
          search_volume: number;
          difficulty: 'very-easy' | 'easy' | 'medium' | 'hard' | 'very-hard';
          intent:
            | 'informational'
            | 'navigational'
            | 'transactional'
            | 'commercial';
          opportunity_score: number;
          status: 'tracking' | 'paused' | 'opportunity' | 'ignored';
          current_rank: number | null;
          target_url: string | null;
          cpc: number | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        }[];
      };
      can_access_keyword: {
        Args: {
          p_keyword_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      calculate_opportunity_score: {
        Args: {
          p_search_volume: number;
          p_difficulty: 'very-easy' | 'easy' | 'medium' | 'hard' | 'very-hard';
          p_current_rank?: number | null;
        };
        Returns: number;
      };

      // SERP Analyses helper functions
      upsert_serp_analysis: {
        Args: {
          p_organization_id: string;
          p_product_id?: string | null;
          p_keyword_id: string;
          p_query: string;
          p_device?: string;
          p_location?: string;
          p_competitor_urls?: string[] | null;
          p_top_10_results?: Json | null;
          p_gaps?: Json | null;
          p_serp_features?: Json | null;
          p_search_volume?: number;
          p_difficulty_score?: number | null;
          p_opportunity_score?: number | null;
          p_recommendations?: Json | null;
          p_metadata?: Json;
        };
        Returns: {
          id: string;
          organization_id: string;
          product_id: string | null;
          keyword_id: string;
          query: string;
          device: string;
          location: string;
          competitor_urls: string[];
          competitor_domains: string[];
          top_10_results: Json;
          gaps: Json;
          serp_features: Json;
          search_volume: number;
          difficulty_score: number | null;
          opportunity_score: number | null;
          status: 'pending' | 'analyzing' | 'completed' | 'failed';
          error_message: string | null;
          recommendations: Json;
          analyzed_at: string | null;
          created_at: string;
          updated_at: string;
          metadata: Json;
        };
      };
      get_keyword_serp_analysis: {
        Args: {
          p_keyword_id: string;
          p_device?: string;
          p_location?: string;
        };
        Returns: {
          id: string;
          query: string;
          device: string;
          location: string;
          competitor_urls: string[];
          competitor_domains: string[];
          top_10_results: Json;
          gaps: Json;
          serp_features: Json;
          search_volume: number;
          difficulty_score: number | null;
          opportunity_score: number | null;
          status: 'pending' | 'analyzing' | 'completed' | 'failed';
          recommendations: Json;
          analyzed_at: string | null;
          created_at: string;
        }[];
      };
      get_product_serp_analyses: {
        Args: {
          p_product_id: string;
          p_device?: string | null;
          p_location?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          keyword_id: string;
          query: string;
          device: string;
          location: string;
          competitor_urls: string[];
          gaps: Json;
          opportunity_score: number | null;
          status: 'pending' | 'analyzing' | 'completed' | 'failed';
          analyzed_at: string | null;
        }[];
      };
      get_organization_serp_analyses: {
        Args: {
          p_organization_id: string;
          p_product_id?: string | null;
          p_device?: string | null;
          p_location?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          product_id: string | null;
          keyword_id: string;
          query: string;
          device: string;
          location: string;
          competitor_urls: string[];
          gaps: Json;
          opportunity_score: number | null;
          status: 'pending' | 'analyzing' | 'completed' | 'failed';
          analyzed_at: string | null;
        }[];
      };
      can_access_serp_analysis: {
        Args: {
          p_serp_analysis_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      calculate_serp_opportunity_score: {
        Args: {
          p_gaps: Json;
          p_search_volume: number;
          p_difficulty_score: number | null;
        };
        Returns: number;
      };

      // Team Members helper functions
      get_organization_team_members: {
        Args: {
          p_organization_id: string;
          p_include_pending?: boolean;
        };
        Returns: {
          id: string;
          user_id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          role: 'owner' | 'admin' | 'editor' | 'viewer';
          invited_at: string;
          accepted_at: string | null;
          is_pending: boolean;
        }[];
      };
      get_user_team_memberships: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          id: string;
          organization_id: string;
          organization_name: string;
          role: 'owner' | 'admin' | 'editor' | 'viewer';
          invited_at: string;
          accepted_at: string | null;
          is_pending: boolean;
        }[];
      };
      add_team_member: {
        Args: {
          p_organization_id: string;
          p_user_id: string;
          p_role?: 'owner' | 'admin' | 'editor' | 'viewer';
        };
        Returns: string;
      };
      accept_team_invitation: {
        Args: {
          p_team_member_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      update_team_member_role: {
        Args: {
          p_team_member_id: string;
          p_new_role: 'owner' | 'admin' | 'editor' | 'viewer';
          p_requesting_user_id: string;
        };
        Returns: boolean;
      };
      remove_team_member: {
        Args: {
          p_team_member_id: string;
          p_requesting_user_id: string;
        };
        Returns: boolean;
      };
      has_team_role: {
        Args: {
          p_organization_id: string;
          p_user_id: string;
          p_required_roles: ('owner' | 'admin' | 'editor' | 'viewer')[];
        };
        Returns: boolean;
      };
      get_team_role: {
        Args: {
          p_organization_id: string;
          p_user_id: string;
        };
        Returns: 'owner' | 'admin' | 'editor' | 'viewer' | null;
      };

      // Activity logs helper functions
      create_activity_log: {
        Args: {
          p_organization_id: string;
          p_user_id: string;
          p_action: 'create' | 'update' | 'delete' | 'publish';
          p_resource_type: string;
          p_resource_id: string;
          p_metadata?: Json | null;
        };
        Returns: string;
      };
      get_organization_activity_logs: {
        Args: {
          p_org_id: string;
          p_limit?: number;
          p_offset?: number;
          p_action?: 'create' | 'update' | 'delete' | 'publish' | null;
          p_resource_type?: string | null;
          p_user_id?: string | null;
        };
        Returns: {
          id: string;
          organization_id: string;
          user_id: string;
          user_name: string;
          user_email: string;
          action: 'create' | 'update' | 'delete' | 'publish';
          resource_type: string;
          resource_id: string;
          metadata: Json | null;
          timestamp: string;
          created_at: string;
        }[];
      };
      get_resource_activity_logs: {
        Args: {
          p_resource_type: string;
          p_resource_id: string;
          p_organization_id?: string | null;
          p_limit?: number;
        };
        Returns: {
          id: string;
          organization_id: string;
          user_id: string;
          user_name: string;
          user_email: string;
          action: 'create' | 'update' | 'delete' | 'publish';
          resource_type: string;
          resource_id: string;
          metadata: Json | null;
          timestamp: string;
        }[];
      };
      get_activity_stats: {
        Args: {
          p_org_id: string;
          p_start_date?: string | null;
          p_end_date?: string | null;
        };
        Returns: {
          action: 'create' | 'update' | 'delete' | 'publish';
          count: number;
          resource_type: string;
        }[];
      };

      // Backlinks helper functions
      soft_delete_backlink: {
        Args: {
          p_backlink_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      get_organization_backlinks: {
        Args: {
          p_org_id: string;
          p_include_deleted?: boolean;
          p_product_id?: string | null;
          p_article_id?: string | null;
          p_status?:
            | 'pending'
            | 'active'
            | 'lost'
            | 'disavowed'
            | 'spam'
            | null;
        };
        Returns: {
          id: string;
          source_url: string;
          target_url: string;
          domain_authority: number | null;
          page_authority: number | null;
          status: 'pending' | 'active' | 'lost' | 'disavowed' | 'spam';
          link_type: 'dofollow' | 'nofollow' | 'sponsored' | 'ugc' | null;
          anchor_text: string | null;
          first_seen_at: string;
          last_verified_at: string | null;
          created_at: string;
        }[];
      };
      get_product_backlinks: {
        Args: {
          p_product_id: string;
          p_include_deleted?: boolean;
          p_status?:
            | 'pending'
            | 'active'
            | 'lost'
            | 'disavowed'
            | 'spam'
            | null;
        };
        Returns: {
          id: string;
          source_url: string;
          target_url: string;
          domain_authority: number | null;
          page_authority: number | null;
          status: 'pending' | 'active' | 'lost' | 'disavowed' | 'spam';
          link_type: 'dofollow' | 'nofollow' | 'sponsored' | 'ugc' | null;
          anchor_text: string | null;
          first_seen_at: string;
          last_verified_at: string | null;
          created_at: string;
        }[];
      };
      get_article_backlinks: {
        Args: {
          p_article_id: string;
          p_include_deleted?: boolean;
          p_status?:
            | 'pending'
            | 'active'
            | 'lost'
            | 'disavowed'
            | 'spam'
            | null;
        };
        Returns: {
          id: string;
          source_url: string;
          target_url: string;
          domain_authority: number | null;
          page_authority: number | null;
          status: 'pending' | 'active' | 'lost' | 'disavowed' | 'spam';
          link_type: 'dofollow' | 'nofollow' | 'sponsored' | 'ugc' | null;
          anchor_text: string | null;
          first_seen_at: string;
          last_verified_at: string | null;
          created_at: string;
        }[];
      };
      can_access_backlink: {
        Args: {
          p_backlink_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      update_backlink_status: {
        Args: {
          p_backlink_id: string;
          p_status: 'pending' | 'active' | 'lost' | 'disavowed' | 'spam';
          p_user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      organization_tier: 'free' | 'starter' | 'pro' | 'agency';
      organization_role: 'owner' | 'admin' | 'member' | 'viewer';
      user_role: 'owner' | 'admin' | 'member' | 'viewer';
      team_member_role: 'owner' | 'admin' | 'editor' | 'viewer';
      team_invitation_status:
        | 'pending'
        | 'accepted'
        | 'declined'
        | 'expired'
        | 'cancelled';
      product_status: 'active' | 'archived' | 'pending';
      keyword_status: 'tracking' | 'paused' | 'opportunity' | 'ignored';
      search_intent:
        | 'informational'
        | 'navigational'
        | 'transactional'
        | 'commercial';
      difficulty_level: 'very-easy' | 'easy' | 'medium' | 'hard' | 'very-hard';
      serp_analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed';
      gap_type:
        | 'missing_topic'
        | 'weak_content'
        | 'format_mismatch'
        | 'lack_depth'
        | 'outdated'
        | 'no_featured_snippet'
        | 'no_video'
        | 'no_images'
        | 'poor_structure'
        | 'opportunity';
      activity_action: 'create' | 'update' | 'delete' | 'publish';
      backlink_status: 'pending' | 'active' | 'lost' | 'disavowed' | 'spam';
      link_type: 'dofollow' | 'nofollow' | 'sponsored' | 'ugc';
      data_export_status:
        | 'pending'
        | 'processing'
        | 'completed'
        | 'failed'
        | 'expired';
      data_export_format: 'json' | 'csv';
    };
    CompositeTypes: {
      // Placeholder for composite type definitions
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          id: string;
          name: string;
          owner: string | null;
          created_at: string | null;
          updated_at: string | null;
          public: boolean | null;
        };
        Insert: {
          id?: string;
          name: string;
          owner?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          public?: boolean | null;
        };
        Update: {
          id?: string;
          name?: string;
          owner?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          public?: boolean | null;
        };
      };
      objects: {
        Row: {
          id: string;
          bucket_id: string | null;
          name: string | null;
          owner: string | null;
          created_at: string | null;
          updated_at: string | null;
          last_accessed_at: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          bucket_id?: string | null;
          name?: string | null;
          owner?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          last_accessed_at?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          bucket_id?: string | null;
          name?: string | null;
          owner?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          last_accessed_at?: string | null;
          metadata?: Json | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
