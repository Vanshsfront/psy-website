'use client'

import { createClient } from '@/lib/supabase'

type UploadResult = {
  url: string
  path: string
}

export function useImageUpload() {
  const supabase = createClient()

  const upload = async (
    file: File,
    bucket: string,
    folder: string,
    onProgress?: (pct: number) => void
  ): Promise<UploadResult> => {
    // Validate file type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    if (!allowed.includes(file.type)) {
      throw new Error('File type not supported. Use JPG, PNG, WebP or AVIF.')
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 5MB.')
    }

    const ext = file.name.split('.').pop()
    const uuid = crypto.randomUUID()
    const path = `${folder}/${uuid}.${ext}`

    // Simulate progress start
    onProgress?.(10)

    // Direct Supabase Storage upload
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    onProgress?.(90)

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    if (!urlData?.publicUrl) {
      throw new Error('Could not get public URL after upload')
    }

    onProgress?.(100)

    return {
      url: urlData.publicUrl,
      path: data.path,
    }
  }

  const deleteFile = async (bucket: string, path: string): Promise<void> => {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      throw new Error(`Delete failed: ${error.message}`)
    }
  }

  const replaceFile = async (
    bucket: string,
    oldPath: string,
    newFile: File,
    folder: string,
    onProgress?: (pct: number) => void
  ): Promise<UploadResult> => {
    // Upload new file first, then delete old
    const result = await upload(newFile, bucket, folder, onProgress)

    // Delete old file — don't throw if this fails, new file is already up
    try {
      await deleteFile(bucket, oldPath)
    } catch (e) {
      console.warn('Old file deletion failed silently:', e)
    }

    return result
  }

  return { upload, deleteFile, replaceFile }
}
