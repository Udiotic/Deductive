import { useEffect, useMemo, useRef } from 'react';
import Quill from 'quill';
import DOMPurify from 'dompurify';
import { postForm } from '../lib/api'; // tumhara helper (credentials + CSRF)

export default function QuillEditor({ value, onChange, placeholder }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);

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
                // upload
                const fd = new FormData();
                fd.append('file', file);
                const { url } = await postForm('/api/uploads/image', fd);
                // insert
                const range = quill.getSelection(true);
                quill.insertEmbed(range.index, 'image', url, 'user');
                quill.setSelection(range.index + 1, 0);
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
      // Quill v2 me destroy ki need nahi, DOM cleanup enough
    };
  }, [placeholder, toolbar]); // value ko yahan dependency me na rakho (cursor jump hota hai)

  // External value change ko (rare case) set karna ho:
  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;
    // If parent updated value (e.g., load draft), update editor once
    if (value != null && value !== quill.root.innerHTML) {
      const safe = DOMPurify.sanitize(value);
      const pos = quill.getSelection();
      quill.clipboard.dangerouslyPasteHTML(safe);
      if (pos) quill.setSelection(pos);
    }
  }, [value]);

  return (
    <div className="bg-white border rounded">
      <div ref={containerRef} />
    </div>
  );
}
