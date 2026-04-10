'use client';

import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Separator,
  CodeBlock,
} from '@corpusai/ui';
import { Key, Zap, Shield, Code2, Webhook, ArrowRight } from 'lucide-react';

// ── Reusable sub-components (inline, < 15 lines each) ──────────────

function SectionAnchor({
  id,
  icon,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-tx-primary">{children}</h2>
      </div>
    </div>
  );
}

function ParamRow({
  name,
  type,
  required,
  children,
}: {
  name: string;
  type: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] px-4 py-3">
      <div className="flex shrink-0 items-center gap-2">
        <code className="text-sm font-semibold text-[hsl(var(--primary))]">{name}</code>
        <Badge variant="outline" className="text-[10px]">
          {type}
        </Badge>
        {required && (
          <Badge variant="destructive" className="text-[10px]">
            required
          </Badge>
        )}
      </div>
      <p className="text-sm text-tx-muted">{children}</p>
    </div>
  );
}

function MethodBadge({ method }: { method: 'GET' | 'POST' }) {
  const colors =
    method === 'POST'
      ? 'bg-green-500/10 text-green-400 border-green-500/20'
      : 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${colors}`}
    >
      {method}
    </span>
  );
}

// ── Main content ────────────────────────────────────────────────────

export function ApiDocsContent() {
  const t = useTranslations('docs');

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
      {/* Sticky sidebar nav */}
      <nav className="hidden lg:block">
        <div className="sticky top-24 space-y-1">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-tx-disabled">
            {t('toc')}
          </p>
          {[
            { id: 'quickstart', label: t('sections.quickstart') },
            { id: 'authentication', label: t('sections.authentication') },
            { id: 'queryEndpoint', label: 'POST /v1/query' },
            { id: 'listAIsEndpoint', label: 'GET /v1/ais' },
            { id: 'rateLimiting', label: t('sections.rateLimiting') },
            { id: 'errorCodes', label: t('sections.errorCodes') },
            { id: 'sdk', label: t('sections.sdk') },
            { id: 'webhooks', label: t('sections.webhooks') },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="block rounded-md px-3 py-1.5 text-[13px] text-tx-muted transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-tx-primary"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <div className="min-w-0 space-y-12">
        {/* ── Quickstart ── */}
        <section>
          <SectionAnchor id="quickstart" icon={<Zap className="h-4 w-4" />}>
            {t('sections.quickstart')}
          </SectionAnchor>
          <p className="mb-4 text-sm text-tx-muted">{t('quickstartDesc')}</p>
          <Tabs defaultValue="sdk">
            <TabsList>
              <TabsTrigger value="sdk">TypeScript SDK</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>
            <TabsContent value="sdk">
              <CodeBlock language="typescript">
                {`import { CorpusAI } from '@corpusai/sdk';

const client = new CorpusAI('cai_your_api_key');
const { answer, sources } = await client.query('my-ai', 'What is RAG?');
console.log(answer);`}
              </CodeBlock>
            </TabsContent>
            <TabsContent value="curl">
              <CodeBlock language="bash">
                {`curl -X POST https://api.corpusai.io/v1/query \\
  -H "Authorization: Bearer cai_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"slug": "my-ai", "question": "What is RAG?"}'`}
              </CodeBlock>
            </TabsContent>
          </Tabs>
        </section>

        <Separator />

        {/* ── Authentication ── */}
        <section>
          <SectionAnchor id="authentication" icon={<Key className="h-4 w-4" />}>
            {t('sections.authentication')}
          </SectionAnchor>
          <p className="mb-4 text-sm text-tx-muted">{t('authDesc')}</p>
          <Card variant="glass">
            <CardContent className="p-4">
              <ol className="space-y-2 text-sm text-tx-secondary">
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.15)] text-[10px] font-bold text-[hsl(var(--primary))]">
                    1
                  </span>
                  {t('authStep1')}
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.15)] text-[10px] font-bold text-[hsl(var(--primary))]">
                    2
                  </span>
                  {t('authStep2')}
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.15)] text-[10px] font-bold text-[hsl(var(--primary))]">
                    3
                  </span>
                  {t('authStep3')}
                </li>
              </ol>
            </CardContent>
          </Card>
          <CodeBlock language="bash">
            {`curl -H "Authorization: Bearer cai_your_api_key" \\
  https://api.corpusai.io/v1/ais`}
          </CodeBlock>
        </section>

        <Separator />

        {/* ── POST /v1/query ── */}
        <section>
          <SectionAnchor id="queryEndpoint" icon={<ArrowRight className="h-4 w-4" />}>
            <span className="flex items-center gap-2">
              <MethodBadge method="POST" /> /v1/query
            </span>
          </SectionAnchor>
          <p className="mb-4 text-sm text-tx-muted">{t('queryEndpointDesc')}</p>

          <h3 className="mb-3 text-sm font-semibold text-tx-secondary">{t('requestBody')}</h3>
          <div className="mb-6 space-y-2">
            <ParamRow name="slug" type="string" required>
              {t('querySlugDesc')}
            </ParamRow>
            <ParamRow name="question" type="string" required>
              {t('queryQuestionDesc')}
            </ParamRow>
          </div>

          <Tabs defaultValue="request">
            <TabsList>
              <TabsTrigger value="request">{t('exampleRequest')}</TabsTrigger>
              <TabsTrigger value="response">{t('exampleResponse')}</TabsTrigger>
            </TabsList>
            <TabsContent value="request">
              <CodeBlock language="bash">
                {`curl -X POST https://api.corpusai.io/v1/query \\
  -H "Authorization: Bearer cai_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "slug": "typescript-guide",
    "question": "What are the benefits of TypeScript?"
  }'`}
              </CodeBlock>
            </TabsContent>
            <TabsContent value="response">
              <CodeBlock language="json">
                {`{
  "answer": "TypeScript offers several key benefits: static type checking...",
  "sources": [
    {
      "chunkId": "chunk_abc123",
      "documentSource": "typescript-guide.pdf",
      "score": 0.87,
      "text": "TypeScript resolves this problem..."
    }
  ],
  "metrics": {
    "embeddingMs": 45,
    "searchMs": 12,
    "rerankMs": 89,
    "llmMs": 1234,
    "totalMs": 1380,
    "promptTokens": 512,
    "completionTokens": 128,
    "totalTokens": 640
  }
}`}
              </CodeBlock>
            </TabsContent>
          </Tabs>
        </section>

        <Separator />

        {/* ── GET /v1/ais ── */}
        <section>
          <SectionAnchor id="listAIsEndpoint" icon={<ArrowRight className="h-4 w-4" />}>
            <span className="flex items-center gap-2">
              <MethodBadge method="GET" /> /v1/ais
            </span>
          </SectionAnchor>
          <p className="mb-4 text-sm text-tx-muted">{t('listAIsEndpointDesc')}</p>
          <CodeBlock language="json">
            {`[
  {
    "id": "clx1abc2def",
    "slug": "typescript-guide",
    "name": "TypeScript Expert",
    "description": "An AI trained on TypeScript documentation",
    "documentCount": 12
  }
]`}
          </CodeBlock>
        </section>

        <Separator />

        {/* ── Rate Limiting ── */}
        <section>
          <SectionAnchor id="rateLimiting" icon={<Shield className="h-4 w-4" />}>
            {t('sections.rateLimiting')}
          </SectionAnchor>
          <p className="mb-4 text-sm text-tx-muted">{t('rateLimitDesc')}</p>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-tx-disabled">
                      Header
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-tx-disabled">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="text-tx-muted">
                  <tr className="border-b border-[hsl(var(--border))]">
                    <td className="px-4 py-3">
                      <code className="text-xs text-[hsl(var(--primary))]">X-RateLimit-Limit</code>
                    </td>
                    <td className="px-4 py-3">{t('rateLimitHeader')}</td>
                  </tr>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <td className="px-4 py-3">
                      <code className="text-xs text-[hsl(var(--primary))]">
                        X-RateLimit-Remaining
                      </code>
                    </td>
                    <td className="px-4 py-3">{t('rateLimitRemaining')}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">
                      <code className="text-xs text-[hsl(var(--primary))]">X-RateLimit-Reset</code>
                    </td>
                    <td className="px-4 py-3">{t('rateLimitReset')}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* ── Error Codes ── */}
        <section>
          <SectionAnchor id="errorCodes" icon={<Shield className="h-4 w-4" />}>
            {t('sections.errorCodes')}
          </SectionAnchor>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-tx-disabled">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-tx-disabled">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="text-tx-muted">
                  {[
                    { code: '400', desc: t('error400') },
                    { code: '401', desc: t('error401') },
                    { code: '404', desc: t('error404') },
                    { code: '429', desc: t('error429') },
                    { code: '500', desc: t('error500') },
                  ].map((err, i, arr) => (
                    <tr
                      key={err.code}
                      className={i < arr.length - 1 ? 'border-b border-[hsl(var(--border))]' : ''}
                    >
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            err.code === '429'
                              ? 'warning'
                              : err.code.startsWith('5')
                                ? 'destructive'
                                : 'outline'
                          }
                        >
                          {err.code}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{err.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* ── SDK ── */}
        <section>
          <SectionAnchor id="sdk" icon={<Code2 className="h-4 w-4" />}>
            {t('sections.sdk')}
          </SectionAnchor>
          <p className="mb-2 text-sm text-tx-muted">{t('sdkDesc')}</p>
          <CodeBlock language="bash">{'npm install @corpusai/sdk'}</CodeBlock>

          <h3 className="mb-3 mt-6 text-sm font-semibold text-tx-secondary">
            {t('exampleRequest')}
          </h3>
          <CodeBlock language="typescript">
            {`import { CorpusAI } from '@corpusai/sdk';

const client = new CorpusAI('cai_your_api_key');

// Query an AI assistant
const { answer, sources, metrics } = await client.query(
  'typescript-guide',
  'What are the benefits of TypeScript?'
);
console.log(answer);
console.log(\`Found \${sources.length} sources in \${metrics.totalMs}ms\`);

// List all your AI assistants
const ais = await client.listAIs();
for (const ai of ais) {
  console.log(\`\${ai.name} (\${ai.documentCount} docs)\`);
}`}
          </CodeBlock>

          <h3 className="mb-3 mt-6 text-sm font-semibold text-tx-secondary">
            {t('sdkErrorHandling')}
          </h3>
          <CodeBlock language="typescript">
            {`import { CorpusAI, CorpusAIError } from '@corpusai/sdk';

try {
  const response = await client.query('my-ai', 'Hello');
} catch (error) {
  if (error instanceof CorpusAIError) {
    console.error(\`API error \${error.status}: \${error.body.message}\`);
  }
}`}
          </CodeBlock>
        </section>

        <Separator />

        {/* ── Webhooks ── */}
        <section>
          <SectionAnchor id="webhooks" icon={<Webhook className="h-4 w-4" />}>
            {t('sections.webhooks')}
          </SectionAnchor>
          <p className="mb-4 text-sm text-tx-muted">{t('webhooksDesc')}</p>

          <h3 className="mb-3 text-sm font-semibold text-tx-secondary">{t('webhookEvents')}</h3>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody className="text-tx-muted">
                  {[
                    { event: 'document.indexed', desc: t('eventDocIndexed') },
                    { event: 'document.failed', desc: t('eventDocFailed') },
                    { event: 'conversation.started', desc: t('eventConvStarted') },
                    { event: 'message.received', desc: t('eventMsgReceived') },
                  ].map((item, i, arr) => (
                    <tr
                      key={item.event}
                      className={i < arr.length - 1 ? 'border-b border-[hsl(var(--border))]' : ''}
                    >
                      <td className="px-4 py-3">
                        <code className="text-xs text-[hsl(var(--primary))]">{item.event}</code>
                      </td>
                      <td className="px-4 py-3">{item.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <h3 className="mb-3 mt-6 text-sm font-semibold text-tx-secondary">
            {t('webhookVerification')}
          </h3>
          <p className="mb-3 text-sm text-tx-muted">{t('webhookVerifyDesc')}</p>
          <CodeBlock language="typescript">
            {`import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}
          </CodeBlock>
        </section>
      </div>
    </div>
  );
}
