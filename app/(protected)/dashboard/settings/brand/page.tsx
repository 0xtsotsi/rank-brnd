'use client';

/**
 * Brand Settings Page
 * Page for managing brand colors, tone, style guides, and logo
 */

import { useState, useEffect } from 'react';
import { BrandSettingsForm } from '@/components/settings/brand-settings-form';
import type { BrandSettingsFormData } from '@/types/brand-settings';
import {
  DEFAULT_BRAND_SETTINGS,
  brandSettingsToFormData,
} from '@/types/brand-settings';

export default function BrandSettingsPage() {
  const [settings, setSettings] = useState<BrandSettingsFormData>(
    brandSettingsToFormData(DEFAULT_BRAND_SETTINGS)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/brand');
      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching brand settings:', error);
      setSaveStatus({
        type: 'error',
        message: 'Failed to load brand settings',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (data: BrandSettingsFormData) => {
    setIsSaving(true);
    setSaveStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/settings/brand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setSettings(result.settings);
        setSaveStatus({
          type: 'success',
          message: 'Brand settings saved successfully!',
        });
      } else {
        setSaveStatus({
          type: 'error',
          message: result.error || 'Failed to save brand settings',
        });
      }
    } catch (error) {
      console.error('Error saving brand settings:', error);
      setSaveStatus({
        type: 'error',
        message: 'Failed to save brand settings',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="brand-settings-page">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Brand Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure your brand colors, tone, style guides, and logo.
        </p>
      </div>

      {/* Save Status Notification */}
      {saveStatus.type && (
        <div
          className={cn(
            'p-4 rounded-lg',
            saveStatus.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          )}
          data-testid="save-status-notification"
        >
          <div className="flex items-center gap-2">
            {saveStatus.type === 'success' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className="font-medium">{saveStatus.message}</span>
          </div>
        </div>
      )}

      {/* Brand Settings Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <svg
                className="animate-spin h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Loading brand settings...
            </div>
          </div>
        ) : (
          <BrandSettingsForm
            initialData={settings}
            onSave={handleSave}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
