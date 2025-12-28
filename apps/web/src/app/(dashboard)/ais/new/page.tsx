"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
} from "@corpusai/ui";

export default function CreateAIPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form state
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [systemPrompt, setSystemPrompt] = React.useState("");
  const [welcomeMessage, setWelcomeMessage] = React.useState(
    "Bonjour ! Comment puis-je vous aider aujourd'hui ?"
  );
  const [primaryColor, setPrimaryColor] = React.useState("#3b82f6");
  const [isPublic, setIsPublic] = React.useState(true);
  const [maxTokens, setMaxTokens] = React.useState(1024);
  const [temperature, setTemperature] = React.useState(0.7);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:3001/ais", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          slug,
          description,
          systemPrompt,
          welcomeMessage,
          primaryColor,
          accessType: isPublic ? "FREE" : "PRIVATE",
          maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erreur lors de la creation");
      }

      const ai = await response.json();
      router.push(`/ais/${ai.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Creer un assistant IA
        </h1>
        <p className="text-muted-foreground mt-2">
          Configurez votre assistant et commencez a lui ajouter des documents.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="behavior">Comportement</TabsTrigger>
            <TabsTrigger value="appearance">Apparence</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations de base</CardTitle>
                <CardDescription>
                  Definissez le nom et la description de votre assistant.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de l&apos;assistant *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: FAQ Support Client"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL personnalisee</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      corpusai.app/chat/
                    </span>
                    <Input
                      id="slug"
                      placeholder="faq-support"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      pattern="^[a-z0-9-]+$"
                      maxLength={50}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Lettres minuscules, chiffres et tirets uniquement.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Decrivez ce que fait votre assistant..."
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
                    <span className="text-sm text-muted-foreground">
                      {maxTokens}
                    </span>
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
        </Tabs>

        {error && (
          <div className="mt-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="mt-8 flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isLoading || !name || !slug}>
            {isLoading ? "Creation en cours..." : "Creer l'assistant"}
          </Button>
        </div>
      </form>
    </div>
  );
}
