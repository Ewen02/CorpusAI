export default function EmbedNotFound() {
  return (
    <div className="flex h-screen items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-4 text-4xl">🔍</div>
        <h1 className="mb-2 text-xl font-semibold">Assistant introuvable</h1>
        <p className="text-muted-foreground">
          Cet assistant n'existe pas ou n'est plus disponible.
        </p>
      </div>
    </div>
  );
}
