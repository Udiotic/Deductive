// src/components/ImageUpload.jsx - New sleek image upload component
import { useState, useRef } from 'react';
import { postForm } from '../lib/api';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

export default function ImageUpload({ 
  images = [], 
  onImagesChange, 
  maxImages = 3,
  title = "Add Images",
  description = "Upload images to enhance your content",
  className = ""
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;
    
    // Check if adding these files would exceed the limit
    if (images.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    setUploading(true);
    setError('');

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Client-side validation
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} is too large (max 5MB)`);
        }

        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not an image`);
        }

        // Upload to server
        const fd = new FormData();
        fd.append('file', file);
        const response = await postForm('/api/uploads/image', fd);
        
        return {
          url: response.url,
          alt: file.name.split('.')[0], // Use filename without extension as alt
        };
      });

      const newImages = await Promise.all(uploadPromises);
      onImagesChange([...images, ...newImages]);
      
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || 'Upload failed. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const updateImageAlt = (index, alt) => {
    const newImages = images.map((img, i) => 
      i === index ? { ...img, alt } : img
    );
    onImagesChange(newImages);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <div className="text-sm text-gray-500">
          {images.length}/{maxImages}
        </div>
      </div>

      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={maxImages > 1}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="text-indigo-500 animate-spin" />
              <p className="text-gray-600 font-medium">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <Upload size={24} className="text-gray-400 group-hover:text-indigo-500" />
              </div>
              <div>
                <p className="text-gray-900 font-medium">Click to upload images</p>
                <p className="text-sm text-gray-500">PNG, JPG, GIF up to 5MB each</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group bg-gray-50 rounded-2xl p-4 border border-gray-200">
              {/* Image Preview */}
              <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden mb-3">
                <img
                  src={image.url}
                  alt={image.alt || ''}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Alt Text Input */}
              <input
                type="text"
                placeholder="Image description (optional)"
                value={image.alt || ''}
                onChange={(e) => updateImageAlt(index, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />

              {/* Remove Button */}
              <button
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Success Message */}
      {images.length > 0 && !uploading && !error && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-500" />
          <span className="text-sm text-emerald-700">
            {images.length} image{images.length !== 1 ? 's' : ''} uploaded successfully
          </span>
        </div>
      )}
    </div>
  );
}
