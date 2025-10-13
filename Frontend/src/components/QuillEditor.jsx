import { useEffect, useMemo, useRef, useState } from 'react';
import Quill from 'quill';
import DOMPurify from 'dompurify';
import { postForm } from '../lib/api'; 
import ErrorPopup from '../components/ErrorPopup'; // ✅ Just add the popup component

export default function QuillEditor({ value, onChange, placeholder }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  
  // ✅ Simple error state
  const [error, setError] = useState(null);

  const toolbar = useMemo(() => ([
    [{ header: [1, 2, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean'],
  ]), []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Editor container create
    const el = document.createElement('div');
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(el);

    // Init Quill (full build)
    const quill = new Quill(el, {
      theme: 'snow',
      placeholder,
      modules: {
        toolbar: {
          container: toolbar,
          handlers: {
            image: async function imageHandler() {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;

                // ✅ Client-side size check
                const maxSize = 5 * 1024 * 1024; // 5MB
                if (file.size > maxSize) {
                  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
                  setError({
                    title: "Image Too Large",
                    message: `Your image (${sizeMB}MB) exceeds the 5MB limit. Please choose a smaller image or compress it first.`,
                    type: "error"
                  });
                  return;
                }

                try {
                  // ✅ Show loading cursor
                  quill.enable(false);
                  
                  // Upload
                  const fd = new FormData();
                  fd.append('file', file);
                  const { url } = await postForm('/api/uploads/image', fd);
                  
                  // Insert image
                  const range = quill.getSelection(true);
                  quill.insertEmbed(range.index, 'image', url, 'user');
                  quill.setSelection(range.index + 1, 0);
                  
                } catch (err) {
                  // ✅ Handle server errors
                  if (err.message.includes('File too large') || err.message.includes('5MB')) {
                    setError({
                      title: "Upload Failed", 
                      message: "Image size exceeds the 5MB limit. Please choose a smaller image.",
                      type: "error"
                    });
                  } else if (err.message.includes('unsupported mimetype')) {
                    setError({
                      title: "Invalid Image Type",
                      message: "Please upload a valid image file (JPG, PNG, GIF, WEBP).",
                      type: "error"
                    });
                  } else {
                    setError({
                      title: "Upload Error",
                      message: err.message || "Failed to upload image. Please try again.",
                      type: "error"
                    });
                  }
                } finally {
                  // ✅ Re-enable editor
                  quill.enable(true);
                }
              };
              input.click();
            }
          }
        }
      }
    });

    // Initial value (HTML) paste
    if (value) {
      const safe = DOMPurify.sanitize(value);
      quill.clipboard.dangerouslyPasteHTML(safe);
    }

    // Change → HTML string
    const handler = () => {
      const html = quill.root.innerHTML;
      onChange?.(html);
    };
    quill.on('text-change', handler);

    quillRef.current = quill;
    return () => {
      quill.off('text-change', handler);
      quillRef.current = null;
    };
  }, [placeholder, toolbar]);

  // External value change
  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;
    if (value != null && value !== quill.root.innerHTML) {
      const safe = DOMPurify.sanitize(value);
      const pos = quill.getSelection();
      quill.clipboard.dangerouslyPasteHTML(safe);
      if (pos) quill.setSelection(pos);
    }
  }, [value]);

  return (
    <>
      <div className="bg-white border rounded">
        <div ref={containerRef} />
      </div>
      
      <ErrorPopup
        isOpen={!!error}
        onClose={() => setError(null)}
        title={error?.title}
        message={error?.message}
        type={error?.type}
      />
    </>
  );
}
