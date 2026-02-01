export default function EmbedNotFound() {
  return (
    <div className="h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h1 className="text-xl font-semibold mb-2">Assistant introuvable</h1>
        <p className="text-muted-foreground">
          Cet assistant n'existe pas ou n'est plus disponible.
        </p>
      </div>
    </div>
  );
}
