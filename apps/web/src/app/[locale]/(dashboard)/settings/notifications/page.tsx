'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Switch,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Separator,
} from '@corpusai/ui';
import { apiClient } from '@/lib/api-client';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface NotificationCategory {
  id: string;
  title: string;
  description: string;
  settings: NotificationSetting[];
}

function getDefaultCategories(t: (key: string) => string): NotificationCategory[] {
  return [
    {
      id: 'email',
      title: t('emailTitle'),
      description: t('emailDescription'),
      settings: [
        {
          id: 'email_weekly',
          label: t('weeklySummary'),
          description: t('weeklySummaryDesc'),
          enabled: true,
        },
        {
          id: 'email_quota',
          label: t('quotaAlerts'),
          description: t('quotaAlertsDesc'),
          enabled: true,
        },
        {
          id: 'email_updates',
          label: t('productUpdates'),
          description: t('productUpdatesDesc'),
          enabled: false,
        },
        {
          id: 'email_tips',
          label: t('tipsAndTricks'),
          description: t('tipsAndTricksDesc'),
          enabled: false,
        },
      ],
    },
    {
      id: 'activity',
      title: t('assistantActivity'),
      description: t('assistantActivityDesc'),
      settings: [
        {
          id: 'activity_new_conversation',
          label: t('newConversations'),
          description: t('newConversationsDesc'),
          enabled: false,
        },
        {
          id: 'activity_document_indexed',
          label: t('documentsIndexed'),
          description: t('documentsIndexedDesc'),
          enabled: true,
        },
        {
          id: 'activity_errors',
          label: t('errors'),
          description: t('errorsDesc'),
          enabled: true,
        },
      ],
    },
    {
      id: 'marketing',
      title: t('marketing'),
      description: t('marketingDesc'),
      settings: [
        {
          id: 'marketing_newsletter',
          label: t('newsletter'),
          description: t('newsletterDesc'),
          enabled: false,
        },
        {
          id: 'marketing_offers',
          label: t('specialOffers'),
          description: t('specialOffersDesc'),
          enabled: false,
        },
      ],
    },
  ];
}

export default function SettingsNotificationsPage() {
  const t = useTranslations('notifications');
  const [categories, setCategories] = React.useState<NotificationCategory[]>(() =>
    getDefaultCategories(t)
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Load saved preferences on mount
  React.useEffect(() => {
    apiClient
      .get<{ notificationPreferences?: Record<string, boolean> | null }>('/users/me')
      .then((profile) => {
        const prefs = profile.notificationPreferences;
        if (!prefs) return;
        setCategories((prev) =>
          prev.map((category) => ({
            ...category,
            settings: category.settings.map((setting) => ({
              ...setting,
              enabled:
                setting.id in prefs ? (prefs[setting.id] ?? setting.enabled) : setting.enabled,
            })),
          }))
        );
      })
      .catch(() => {
        // Non-blocking — keep defaults if fetch fails
      });
  }, []);

  const handleToggle = (categoryId: string, settingId: string) => {
    setCategories((prev) =>
      prev.map((category) => {
        if (category.id !== categoryId) return category;
        return {
          ...category,
          settings: category.settings.map((setting) => {
            if (setting.id !== settingId) return setting;
            return { ...setting, enabled: !setting.enabled };
          }),
        };
      })
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const prefs: Record<string, boolean> = {};
      categories.forEach((category) => {
        category.settings.forEach((setting) => {
          prefs[setting.id] = setting.enabled;
        });
      });
      await apiClient.patch('/users/me', { notificationPreferences: prefs });
      setHasChanges(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('errorSaving'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisableAll = () => {
    setCategories((prev) =>
      prev.map((category) => ({
        ...category,
        settings: category.settings.map((setting) => ({
          ...setting,
          enabled: false,
        })),
      }))
    );
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <Card key={category.id}>
          <CardHeader>
            <CardTitle>{category.title}</CardTitle>
            <CardDescription>{category.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {category.settings.map((setting, idx) => (
              <React.Fragment key={setting.id}>
                {idx > 0 && <Separator />}
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <label htmlFor={setting.id} className="cursor-pointer text-sm font-medium">
                      {setting.label}
                    </label>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                  <Switch
                    id={setting.id}
                    checked={setting.enabled}
                    onCheckedChange={() => handleToggle(category.id, setting.id)}
                  />
                </div>
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Actions */}
      <div className="space-y-3 pt-4">
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleDisableAll}>
            {t('disableAll')}
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? t('saving') : t('savePreferences')}
          </Button>
        </div>
      </div>
    </div>
  );
}
