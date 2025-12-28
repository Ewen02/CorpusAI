"use client";

import * as React from "react";
import {
  Button,
  Switch,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Separator,
} from "@corpusai/ui";

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

const defaultCategories: NotificationCategory[] = [
  {
    id: "email",
    title: "Notifications par email",
    description: "Gérez les emails que vous recevez de CorpusAI",
    settings: [
      {
        id: "email_weekly",
        label: "Résumé hebdomadaire",
        description: "Recevez un résumé de l'activité de vos assistants",
        enabled: true,
      },
      {
        id: "email_quota",
        label: "Alertes de quota",
        description: "Soyez averti lorsque vous approchez de vos limites",
        enabled: true,
      },
      {
        id: "email_updates",
        label: "Mises à jour produit",
        description: "Nouveautés et améliorations de CorpusAI",
        enabled: false,
      },
      {
        id: "email_tips",
        label: "Conseils et astuces",
        description: "Apprenez à mieux utiliser vos assistants IA",
        enabled: false,
      },
    ],
  },
  {
    id: "activity",
    title: "Activité des assistants",
    description: "Notifications sur vos assistants IA",
    settings: [
      {
        id: "activity_new_conversation",
        label: "Nouvelles conversations",
        description: "Quand un utilisateur démarre une conversation",
        enabled: false,
      },
      {
        id: "activity_document_indexed",
        label: "Documents indexés",
        description: "Quand un document est prêt à être utilisé",
        enabled: true,
      },
      {
        id: "activity_errors",
        label: "Erreurs",
        description: "Quand un probleme survient avec un assistant",
        enabled: true,
      },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    description: "Communications promotionnelles",
    settings: [
      {
        id: "marketing_newsletter",
        label: "Newsletter",
        description: "Actualites sur l'IA et CorpusAI",
        enabled: false,
      },
      {
        id: "marketing_offers",
        label: "Offres speciales",
        description: "Promotions et offres exclusives",
        enabled: false,
      },
    ],
  },
];

export default function SettingsNotificationsPage() {
  const [categories, setCategories] = React.useState(defaultCategories);
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);

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
    try {
      // TODO: Save preferences to API
      await new Promise((resolve) => setTimeout(resolve, 500));
      setHasChanges(false);
    } catch (err) {
      console.error("Error saving preferences:", err);
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
                    <label
                      htmlFor={setting.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {setting.label}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {setting.description}
                    </p>
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
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={handleDisableAll}>
          Tout désactiver
        </Button>
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving ? "Enregistrement..." : "Enregistrer les préférences"}
        </Button>
      </div>
    </div>
  );
}
