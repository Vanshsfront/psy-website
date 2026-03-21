'use client'

import { useReducer, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Upload, Trash2, RefreshCw, Plus } from 'lucide-react'
import { useImageUpload } from '@/hooks/useImageUpload'
import { useToast } from '@/hooks/useToast'

/* ─── Types ─── */
interface ImageItem {
  id: string
  url: string
  path: string
  uploading?: boolean
  progress?: number
  error?: string
}

interface State {
  items: ImageItem[]
}

type Action =
  | { type: 'ADD'; item: ImageItem }
  | { type: 'SET_PROGRESS'; id: string; progress: number }
  | { type: 'SET_ERROR'; id: string; error: string }
  | { type: 'CONFIRM'; id: string; url: string; path: string }
  | { type: 'REMOVE'; id: string }
  | { type: 'REPLACE_URL'; id: string; url: string; path: string }
  | { type: 'REORDER'; oldIndex: number; newIndex: number }
  | { type: 'INIT'; items: ImageItem[] }

function imageReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INIT':
      return { items: action.items }
    case 'ADD':
      return { items: [...state.items, action.item] }
    case 'SET_PROGRESS':
      return {
        items: state.items.map((img) =>
          img.id === action.id ? { ...img, progress: action.progress } : img
        ),
      }
    case 'SET_ERROR':
      return {
        items: state.items.map((img) =>
          img.id === action.id
            ? { ...img, error: action.error, uploading: false }
            : img
        ),
      }
    case 'CONFIRM':
      return {
        items: state.items.map((img) =>
          img.id === action.id
            ? { ...img, url: action.url, path: action.path, uploading: false, progress: undefined }
            : img
        ),
      }
    case 'REMOVE':
      return { items: state.items.filter((img) => img.id !== action.id) }
    case 'REPLACE_URL':
      return {
        items: state.items.map((img) =>
          img.id === action.id
            ? { ...img, url: action.url, path: action.path, uploading: false, progress: undefined }
            : img
        ),
      }
    case 'REORDER':
      return { items: arrayMove(state.items, action.oldIndex, action.newIndex) }
    default:
      return state
  }
}

/* ─── Helper: extract storage path from public URL ─── */
function extractStoragePath(url: string, bucket: string): string {
  // Public URL format: {supabase_url}/storage/v1/object/public/{bucket}/{path}
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx !== -1) {
    return url.slice(idx + marker.length)
  }
  return ''
}

/* ─── Sortable image slot ─── */
function SortableSlot({
  item,
  index,
  onRemove,
  onReplace,
}: {
  item: ImageItem
  index: number
  onRemove: () => void
  onReplace: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group overflow-hidden aspect-square bg-[#1a1a1a] cursor-grab active:cursor-grabbing"
    >
      {!item.uploading && (
        <img
          src={item.url}
          alt={`Product image ${index + 1}`}
          className="w-full h-full object-cover"
          draggable={false}
        />
      )}

      {/* Upload progress overlay */}
      {item.uploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111111]">
          <div className="w-3/4 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="h-full bg-psy-green rounded-full transition-all duration-300"
              style={{ width: `${item.progress || 0}%` }}
            />
          </div>
          <span className="text-bone text-micro mt-2">{item.progress || 0}%</span>
        </div>
      )}

      {/* Error overlay */}
      {item.error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#111111] p-2">
          <span className="text-terracotta text-micro text-center">{item.error}</span>
        </div>
      )}

      {/* Hover overlay — only when not uploading */}
      {!item.uploading && !item.error && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* Primary badge */}
          {index === 0 && (
            <span className="absolute top-2 left-2 bg-psy-green text-ink text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider">
              Primary
            </span>
          )}

          {/* Replace button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onReplace()
            }}
            className="absolute top-2 right-2 p-1.5 bg-bone/20 hover:bg-bone/40 transition-colors"
            title="Replace image"
          >
            <RefreshCw className="w-3.5 h-3.5 text-bone" />
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="absolute bottom-2 right-2 p-1.5 bg-terracotta/60 hover:bg-terracotta transition-colors"
            title="Remove image"
          >
            <Trash2 className="w-3.5 h-3.5 text-bone" />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Main component ─── */
interface ImageManagerProps {
  initialImages: string[]
  bucket: string
  folder: string
  onChange: (images: string[]) => void
  maxImages?: number
}

export default function ImageManager({
  initialImages,
  bucket,
  folder,
  onChange,
  maxImages = 6,
}: ImageManagerProps) {
  const [state, dispatch] = useReducer(imageReducer, {
    items: initialImages.map((url) => ({
      id: crypto.randomUUID(),
      url,
      path: extractStoragePath(url, bucket),
    })),
  })

  const replaceInputRef = useRef<HTMLInputElement>(null)
  const replaceIdRef = useRef<string>('')
  const addInputRef = useRef<HTMLInputElement>(null)
  const { upload, deleteFile } = useImageUpload()
  const { toast } = useToast()
  const prevInitialRef = useRef<string>(JSON.stringify(initialImages))

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  // Sync initialImages changes (e.g. form reset)
  useEffect(() => {
    const serialized = JSON.stringify(initialImages)
    if (serialized !== prevInitialRef.current) {
      prevInitialRef.current = serialized
      dispatch({
        type: 'INIT',
        items: initialImages.map((url) => ({
          id: crypto.randomUUID(),
          url,
          path: extractStoragePath(url, bucket),
        })),
      })
    }
  }, [initialImages, bucket])

  // Notify parent when items change (only confirmed uploads)
  const notifyParent = useCallback(
    (items: ImageItem[]) => {
      const urls = items
        .filter((i) => !i.uploading && !i.error)
        .map((i) => i.url)
      onChange(urls)
    },
    [onChange]
  )

  // Upload a file and add to state
  const uploadAndAdd = useCallback(
    async (file: File) => {
      const id = crypto.randomUUID()
      dispatch({
        type: 'ADD',
        item: { id, url: '', path: '', uploading: true, progress: 0 },
      })

      try {
        const result = await upload(file, bucket, folder, (pct) => {
          dispatch({ type: 'SET_PROGRESS', id, progress: pct })
        })
        dispatch({ type: 'CONFIRM', id, url: result.url, path: result.path })
        return { id, ...result }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed'
        dispatch({ type: 'SET_ERROR', id, error: msg })
        return null
      }
    },
    [bucket, folder, upload]
  )

  // Drop handler
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const remaining = maxImages - state.items.length
      if (remaining <= 0) {
        toast.error(`Maximum ${maxImages} images allowed`)
        return
      }
      const filesToUpload = acceptedFiles.slice(0, remaining)

      // Upload all in parallel
      const results = await Promise.all(filesToUpload.map(uploadAndAdd))
      const successCount = results.filter(Boolean).length

      if (successCount > 0) {
        toast.success(`${successCount} image(s) uploaded`)
      }
    },
    [maxImages, state.items.length, uploadAndAdd, toast]
  )

  // Effect: notify parent after state changes
  useEffect(() => {
    notifyParent(state.items)
  }, [state.items, notifyParent])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': [],
      'image/avif': [],
    },
    maxSize: 5 * 1024 * 1024,
    disabled: state.items.length >= maxImages,
    noClick: true,
  })

  // Drag end for reorder
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = state.items.findIndex((i) => i.id === active.id)
      const newIndex = state.items.findIndex((i) => i.id === over.id)
      dispatch({ type: 'REORDER', oldIndex, newIndex })
    }
  }

  // Remove handler
  const handleRemove = async (item: ImageItem) => {
    dispatch({ type: 'REMOVE', id: item.id })
    if (item.path) {
      try {
        await deleteFile(bucket, item.path)
      } catch {
        // Silently fail — image is already removed from UI
      }
    }
  }

  // Replace handlers
  const handleReplaceClick = (id: string) => {
    replaceIdRef.current = id
    replaceInputRef.current?.click()
  }

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const id = replaceIdRef.current
    const oldItem = state.items.find((i) => i.id === id)

    // Mark as uploading
    dispatch({ type: 'SET_PROGRESS', id, progress: 0 })

    try {
      const result = await upload(file, bucket, folder, (pct) => {
        dispatch({ type: 'SET_PROGRESS', id, progress: pct })
      })
      dispatch({ type: 'REPLACE_URL', id, url: result.url, path: result.path })

      // Delete old file
      if (oldItem?.path) {
        try {
          await deleteFile(bucket, oldItem.path)
        } catch {
          // Silently fail
        }
      }
      toast.success('Image replaced')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Replace failed'
      dispatch({ type: 'SET_ERROR', id, error: msg })
    }

    if (replaceInputRef.current) replaceInputRef.current.value = ''
  }

  // Add via click on empty slot
  const handleAddClick = () => {
    addInputRef.current?.click()
  }

  const handleAddFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const remaining = maxImages - state.items.length
    const filesToUpload = files.slice(0, remaining)
    await Promise.all(filesToUpload.map(uploadAndAdd))
    if (addInputRef.current) addInputRef.current.value = ''
  }

  // Build slot layout
  const slots = state.items
  const emptySlotCount = Math.max(0, maxImages - slots.length)

  return (
    <div className="space-y-4">
      {/* Image Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={slots.map((s) => s.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-3 gap-3">
            {/* Primary slot (first item) — large */}
            {slots[0] && (
              <div className="col-span-2 row-span-2">
                <SortableSlot
                  item={slots[0]}
                  index={0}
                  onRemove={() => handleRemove(slots[0])}
                  onReplace={() => handleReplaceClick(slots[0].id)}
                />
              </div>
            )}

            {/* Secondary slots */}
            {slots.slice(1).map((item, i) => (
              <SortableSlot
                key={item.id}
                item={item}
                index={i + 1}
                onRemove={() => handleRemove(item)}
                onReplace={() => handleReplaceClick(item.id)}
              />
            ))}

            {/* Empty slots with + placeholder */}
            {Array.from({ length: emptySlotCount }).map((_, i) => (
              <button
                key={`empty-${i}`}
                type="button"
                onClick={handleAddClick}
                className="aspect-square bg-[#1a1a1a] border border-dashed border-[#2a2a2a] flex items-center justify-center hover:border-taupe/40 transition-colors cursor-pointer"
              >
                <Plus className="w-6 h-6 text-taupe/40" />
              </button>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-psy-green bg-psy-green/5'
            : 'border-[#2a2a2a] hover:border-taupe/40'
        } ${state.items.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload className="w-6 h-6 mx-auto mb-2 text-taupe" />
        <p className="text-sm text-taupe">
          {isDragActive
            ? 'Drop images here...'
            : 'Drag & drop images, or click to browse'}
        </p>
        <p className="text-micro text-taupe/60 mt-1">
          JPEG, PNG, WebP, AVIF — max 5MB — {maxImages - state.items.length} slots remaining
        </p>
      </div>

      {/* Hidden inputs */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={handleReplaceFile}
      />
      <input
        ref={addInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="hidden"
        onChange={handleAddFile}
      />
    </div>
  )
}
