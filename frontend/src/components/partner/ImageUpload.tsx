'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, X, Image as ImageIcon } from 'lucide-react'

interface ImageUploadProps {
    currentUrl?: string
    onUpload: (url: string) => void
    label?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8001'

export default function ImageUpload({ currentUrl, onUpload, label = "Upload Image" }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const [progressStatus, setProgressStatus] = useState<string>('')

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file')
            return
        }

        setUploading(true)

        // Simulation steps
        const steps = [
            "Uploading image...",
            "Processing image...",
            "Optimizing in 3...",
            "Optimizing in 2...",
            "Optimizing in 1..."
        ]

        let stepIdx = 0
        setProgressStatus(steps[0])

        const interval = setInterval(() => {
            stepIdx++
            if (stepIdx < steps.length) {
                setProgressStatus(steps[stepIdx])
            }
        }, 800)

        const formData = new FormData()
        formData.append('file', file)

        try {
            // Artificial delay to let user see "Uploading..."
            await new Promise(r => setTimeout(r, 1500))

            const res = await fetch(`${API_BASE}/api/media/upload/`, {
                method: 'POST',
                body: formData,
            })

            clearInterval(interval)

            // Show 100% state briefly
            setProgressStatus("Upload Complete!")
            await new Promise(r => setTimeout(r, 800))

            if (!res.ok) throw new Error('Upload failed')

            const data = await res.json()
            onUpload(data.url)
        } catch (error) {
            console.error('Upload error:', error)
            alert('Failed to upload image')
        } finally {
            clearInterval(interval)
            setUploading(false)
            setProgressStatus('')
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            handleFile(e.target.files[0])
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragActive(false)
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0])
        }
    }

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>

            {currentUrl ? (
                <div className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-[3/4] bg-slate-50">
                    <img
                        src={currentUrl}
                        alt="Product"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="p-2 bg-white rounded-full text-slate-700 hover:text-blue-600 transition-colors"
                            title="Replace Image"
                        >
                            <Upload className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onUpload('')}
                            className="p-2 bg-white rounded-full text-slate-700 hover:text-red-600 transition-colors"
                            title="Remove Image"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onDragEnter={() => setDragActive(true)}
                    onDragLeave={() => setDragActive(false)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`
                        aspect-[3/4] rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all
                        ${dragActive
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                        }
                    `}
                >
                    {uploading ? (
                        <div className="flex flex-col items-center">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                            <p className="text-sm font-medium text-blue-600 animate-pulse">{progressStatus}</p>
                        </div>
                    ) : (
                        <>
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                <ImageIcon className="w-5 h-5 text-slate-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-600">Click to Upload</p>
                            <p className="text-xs text-slate-400 mt-1">or drag & drop</p>
                        </>
                    )}
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleChange}
            />
        </div>
    )
}
