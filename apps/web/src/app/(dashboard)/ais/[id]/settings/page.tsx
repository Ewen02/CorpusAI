"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Input,
  Label,
  Textarea,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Skeleton,
  Badge,
} from "@corpusai/ui";
import { useAI, useUpdateAI, useDeleteAI } from "@/lib/queries";

type AIStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";

export default function AISettingsPage() {
  const params = useParams();
  const router = useRouter();
  const aiId = params.id as string;

  const { data: ai, isLoading } = useAI(aiId);
  const updateAI = useUpdateAI();
  const deleteAI = useDeleteAI();

  // Form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [systemPrompt, setSystemPrompt] = React.useState("");
  const [welcomeMessage, setWelcomeMessage] = React.useState("");
  const [primaryColor, setPrimaryColor] = React.useState("#3b82f6");
  const [isPublic, setIsPublic] = React.useState(true);
  const [maxTokens, setMaxTokens] = React.useState(1024);
  const [temperature, setTemperature] = React.useState(0.7);
  const [status, setStatus] = React.useState<AIStatus>("DRAFT");

  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");

  // Populate form when AI data loads
  React.useEffect(() => {
    if (ai) {
      setName(ai.name || "");
      setDescription(ai.description || "");
      setSystemPrompt(ai.systemPrompt || "");
      setWelcomeMessage(ai.welcomeMessage || "");
      setPrimaryColor(ai.primaryColor || "#3b82f6");
      setIsPublic(ai.isPublic ?? true);
      setMaxTokens(ai.maxTokens || 1024);
      setTemperature(ai.temperature || 0.7);
      setStatus((ai.status as AIStatus) || "DRAFT");
    }
  }, [ai]);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    try {
      await updateAI.mutateAsync({
        id: aiId,
        data: {
          name,
          description,
          systemPrompt,
          welcomeMessage,
          primaryColor,
          isPublic,
          maxTokens,
          temperature,
          status,
        },
      });
      setSuccess("Parametres sauvegardes avec succes");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== ai?.name) return;

    try {
      await deleteAI.mutateAsync(aiId);
      router.push("/ais");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const statusOptions: { value: AIStatus; label: string; description: string; color: string }[] = [
    { value: "DRAFT", label: "Brouillon", description: "Non visible publiquement", color: "bg-yellow-500/20 text-yellow-400" },
    { value: "ACTIVE", label: "Actif", description: "Accessible a tous", color: "bg-green-500/20 text-green-400" },
    { value: "PAUSED", label: "En pause", description: "Temporairement desactive", color: "bg-orange-500/20 text-orange-400" },
    { value: "ARCHIVED", label: "Archive", description: "Conserve mais inactif", color: "bg-muted text-muted-foreground" },
  ];

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!ai) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Assistant introuvable</p>
            <Button className="mt-4" onClick={() => router.push("/ais")}>
              Retour a la liste
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <button onClick={() => router.push(`/ais/${aiId}`)} className="hover:text-foreground">
            {ai.name}
          </button>
          <span>/</span>
          <span>Parametres</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Parametres</h1>
        <p className="text-muted-foreground mt-2">
          Configurez les parametres de votre assistant IA.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="behavior">Comportement</TabsTrigger>
          <TabsTrigger value="appearance">Apparence</TabsTrigger>
          <TabsTrigger value="danger">Danger</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations de base</CardTitle>
              <CardDescription>
                Modifiez le nom et la description de votre assistant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l&apos;assistant</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label>URL personnalisee</Label>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">corpusai.app/chat/</span>
                  <code className="bg-muted px-2 py-1 rounded">{ai.slug}</code>
                </div>
                <p className="text-xs text-muted-foreground">
                  Le slug ne peut pas etre modifie apres la creation.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/500 caracteres
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statut</CardTitle>
              <CardDescription>
                Controlez la visibilite et l&apos;accessibilite de votre assistant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      status === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={option.color}>{option.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acces</CardTitle>
              <CardDescription>
                Definissez qui peut acceder a votre assistant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="public">Acces public</Label>
                  <p className="text-sm text-muted-foreground">
                    Tout le monde peut utiliser cet assistant.
                  </p>
                </div>
                <Switch
                  id="public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Behavior Tab */}
        <TabsContent value="behavior" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prompt systeme</CardTitle>
              <CardDescription>
                Instructions de base pour guider le comportement de l&apos;IA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">Instructions</Label>
                <Textarea
                  id="systemPrompt"
                  placeholder="Tu es un assistant specialise dans..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  maxLength={4000}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  {systemPrompt.length}/4000 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Message d&apos;accueil</Label>
                <Textarea
                  id="welcomeMessage"
                  placeholder="Bonjour ! Comment puis-je vous aider ?"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  maxLength={500}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parametres avances</CardTitle>
              <CardDescription>
                Ajustez le comportement de generation de l&apos;IA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="maxTokens">Tokens maximum</Label>
                  <span className="text-sm text-muted-foreground">{maxTokens}</span>
                </div>
                <input
                  type="range"
                  id="maxTokens"
                  min={100}
                  max={4096}
                  step={100}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Longueur maximale des reponses generees.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="temperature">Temperature</Label>
                  <span className="text-sm text-muted-foreground">
                    {temperature.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  id="temperature"
                  min={0}
                  max={1}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <p className="text-xs text-muted-foreground">
                  0 = precis et deterministe, 1 = creatif et varie.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personnalisation</CardTitle>
              <CardDescription>
                Personnalisez l&apos;apparence de votre assistant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Couleur principale</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="primaryColor"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-20 rounded border border-border cursor-pointer"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="w-32"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm font-medium mb-3">Apercu</p>
                <div className="flex items-start gap-3">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {name ? name.charAt(0).toUpperCase() : "A"}
                  </div>
                  <div className="flex-1">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2 text-sm max-w-[80%]">
                      {welcomeMessage || "Bonjour ! Comment puis-je vous aider ?"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone Tab */}
        <TabsContent value="danger" className="space-y-6">
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Zone de danger</CardTitle>
              <CardDescription>
                Actions irreversibles. Procedez avec precaution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <h4 className="font-medium text-destructive mb-2">Supprimer cet assistant</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Cette action supprimera definitivement l&apos;assistant, tous ses documents,
                  conversations et donnees associees. Cette action est irreversible.
                </p>

                {!showDeleteConfirm ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Supprimer l&apos;assistant
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm">
                      Pour confirmer, tapez <strong>{ai.name}</strong> ci-dessous :
                    </p>
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder={ai.name}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleteConfirmText !== ai.name || deleteAI.isPending}
                      >
                        {deleteAI.isPending ? "Suppression..." : "Confirmer la suppression"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText("");
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Messages */}
      {error && (
        <div className="mt-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-6 p-4 rounded-lg bg-green-500/10 text-green-500 text-sm">
          {success}
        </div>
      )}

      {/* Save Button */}
      <div className="mt-8 flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push(`/ais/${aiId}`)}>
          Retour
        </Button>
        <Button onClick={handleSave} disabled={updateAI.isPending}>
          {updateAI.isPending ? "Sauvegarde..." : "Sauvegarder les modifications"}
        </Button>
      </div>
    </div>
  );
}
