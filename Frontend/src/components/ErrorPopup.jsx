import { useState, useEffect } from 'react';
import { X, AlertTriangle, FileX } from 'lucide-react';

export default function ErrorPopup({ 
  isOpen, 
  onClose, 
  title = "Upload Error",
  message = "Something went wrong",
  type = "error" // "error", "warning", "info"
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300); // Wait for exit animation
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          gradient: 'from-red-500 to-rose-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-900',
          icon: AlertTriangle
        };
      case 'warning':
        return {
          gradient: 'from-amber-500 to-orange-600',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-900',
          icon: AlertTriangle
        };
      default:
        return {
          gradient: 'from-red-500 to-rose-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-900',
          icon: AlertTriangle
        };
    }
  };

  const typeStyles = getTypeStyles();
  const Icon = typeStyles.icon;

  return (
    <div 
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div 
        className={`bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 w-full max-w-md transform transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        {/* Header with Gradient */}
        <div className={`bg-gradient-to-r ${typeStyles.gradient} p-6 rounded-t-3xl relative overflow-hidden`}>
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white rounded-full animate-pulse"></div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white rounded-full animate-pulse delay-300"></div>
          </div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Icon size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <p className="text-white/80 text-sm">Upload Failed</p>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className={`${typeStyles.bg} ${typeStyles.border} border rounded-2xl p-6 mb-6`}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileX size={20} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className={`font-semibold ${typeStyles.text} mb-2`}>File Size Limit Exceeded</h4>
                <p className={`${typeStyles.text}/80 text-sm leading-relaxed`}>
                  {message}
                </p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <h5 className="font-medium text-gray-900 text-sm mb-2">💡 Quick Tips:</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Compress your image before uploading</li>
              <li>• Try using JPEG format for photos</li>
              <li>• Maximum file size is 5MB</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Trigger file picker again
                document.querySelector('input[type="file"]')?.click();
                handleClose();
              }}
              className={`flex-1 px-6 py-3 bg-gradient-to-r ${typeStyles.gradient} text-white font-semibold rounded-2xl hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
