import * as React from 'react';
import { Button, DocumentUploader } from '@corpusai/ui';
import { useTranslations } from 'next-intl';
import type { useDocumentUpload } from '@/app/[locale]/(dashboard)/ais/[id]/hooks/use-document-upload';

interface StepUploadProps {
  uploadedFiles: ReturnType<typeof useDocumentUpload>['uploadedFiles'];
  uploadFiles: ReturnType<typeof useDocumentUpload>['uploadFiles'];
  removeFile: ReturnType<typeof useDocumentUpload>['removeFile'];
  onNext: () => void;
  onSkip: () => void;
}

export function StepUpload({
  uploadedFiles,
  uploadFiles,
  removeFile,
  onNext,
  onSkip,
}: StepUploadProps) {
  const t = useTranslations('onboarding.upload');
  const hasUploaded = uploadedFiles.some(
    (f) => f.status === 'processing' || f.status === 'success'
  );
  const isUploading = uploadedFiles.some((f) => f.status === 'uploading');

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
          {t('title')}
        </h2>
        <p className="text-sm text-[hsl(var(--text-muted))]">{t('subtitle')}</p>
      </div>

      <DocumentUploader
        onFilesSelected={uploadFiles}
        onFileRemove={removeFile}
        uploadedFiles={uploadedFiles}
      />

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className="w-full bg-primary"
          onClick={onNext}
          disabled={!hasUploaded || isUploading}
        >
          {isUploading ? t('uploading') : t('continue')}
        </Button>
        <Button variant="ghost" className="w-full text-[hsl(var(--text-muted))]" onClick={onSkip}>
          {t('skip')}
        </Button>
      </div>
    </div>
  );
}
