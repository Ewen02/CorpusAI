import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentUploader, type UploadedFile } from './document-uploader';

const makeFile = (name: string, size = 1024): File =>
  new File(['content'], name, { type: 'application/pdf' });

const makeUploadedFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  id: `file-${Date.now()}`,
  file: makeFile('test.pdf'),
  status: 'pending',
  progress: 0,
  ...overrides,
});

describe('DocumentUploader', () => {
  it('should render the dropzone with accepted file types', () => {
    render(<DocumentUploader onFilesSelected={vi.fn()} />);

    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Glissez vos fichiers ici')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('TXT')).toBeInTheDocument();
  });

  it('should display remaining file count', () => {
    render(
      <DocumentUploader
        onFilesSelected={vi.fn()}
        maxFiles={5}
        uploadedFiles={[makeUploadedFile(), makeUploadedFile()]}
      />
    );

    expect(screen.getByText(/3 fichier\(s\) restant/)).toBeInTheDocument();
  });

  it('should show pending files in the list', () => {
    const file = makeUploadedFile({
      file: makeFile('rapport.pdf'),
      status: 'pending',
    });

    render(<DocumentUploader onFilesSelected={vi.fn()} uploadedFiles={[file]} />);

    expect(screen.getByText('rapport.pdf')).toBeInTheDocument();
    expect(screen.getByText('En attente')).toBeInTheDocument();
  });

  it('should show error files with error message', () => {
    const file = makeUploadedFile({
      file: makeFile('bad.pdf'),
      status: 'error',
      error: 'Fichier trop volumineux',
    });

    render(<DocumentUploader onFilesSelected={vi.fn()} uploadedFiles={[file]} />);

    expect(screen.getByText('bad.pdf')).toBeInTheDocument();
    expect(screen.getByText('Erreur')).toBeInTheDocument();
    expect(screen.getByText('Fichier trop volumineux')).toBeInTheDocument();
  });

  it('should call onFileRemove when remove button is clicked', () => {
    const onRemove = vi.fn();
    const file = makeUploadedFile({
      id: 'file-123',
      file: makeFile('doc.pdf'),
      status: 'pending',
    });

    render(
      <DocumentUploader onFilesSelected={vi.fn()} onFileRemove={onRemove} uploadedFiles={[file]} />
    );

    fireEvent.click(screen.getByRole('button', { name: /supprimer/i }));
    expect(onRemove).toHaveBeenCalledWith('file-123');
  });

  it('should not show remove button for uploading files', () => {
    const file = makeUploadedFile({
      file: makeFile('uploading.pdf'),
      status: 'uploading',
    });

    render(
      <DocumentUploader onFilesSelected={vi.fn()} onFileRemove={vi.fn()} uploadedFiles={[file]} />
    );

    // Uploading files are filtered out of the visible list (not pending/error)
    expect(screen.queryByRole('button', { name: /supprimer/i })).not.toBeInTheDocument();
  });

  it('should not show files with success status in the list', () => {
    const file = makeUploadedFile({
      file: makeFile('done.pdf'),
      status: 'success',
    });

    render(<DocumentUploader onFilesSelected={vi.fn()} uploadedFiles={[file]} />);

    // Success files are filtered out of the visible file list
    expect(screen.queryByText('done.pdf')).not.toBeInTheDocument();
  });
});
