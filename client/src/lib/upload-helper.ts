import { Platform } from 'react-native';

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function appendFileToFormData(
  formData: FormData,
  fieldName: string,
  file: { uri: string; name: string; mimeType?: string },
) {
  if (Platform.OS === 'web') {
    const res = await fetch(file.uri);
    const blob = await res.blob();
    const webFile = new File([blob], file.name, {
      type: file.mimeType || blob.type || 'application/octet-stream',
    });
    formData.append(fieldName, webFile);
  } else {
    formData.append(fieldName, {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream',
    } as unknown as Blob);
  }
}
