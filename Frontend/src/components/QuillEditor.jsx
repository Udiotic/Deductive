// src/components/QuillEditor.jsx - Removed image functionality
import { useEffect, useMemo, useRef, useState } from 'react';
import Quill from 'quill';
import DOMPurify from 'dompurify';

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'b', 'i',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
    'a', 'span', 'div'
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel',
    'style', 'class'
  ],
  ALLOWED_SCHEMES: ['http', 'https'],
  KEEP_CONTENT: true,
};

export default function QuillEditor({ value, onChange, placeholder }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);

  // ✅ Removed image from toolbar
  const toolbar = useMemo(() => ([
    [{ header: [1, 2, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link'], // ✅ No 'image' option
    ['clean'],
  ]), []);

  useEffect(() => {
    if (!containerRef.current) return;

    const el = document.createElement('div');
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(el);

    // ✅ Simple Quill without image handler
    const quill = new Quill(el, {
      theme: 'snow',
      placeholder,
      modules: {
        toolbar: toolbar
      }
    });

    if (value) {
      const safe = DOMPurify.sanitize(value, SANITIZE_CONFIG);
      quill.clipboard.dangerouslyPasteHTML(safe);
    }

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
  }, [placeholder, toolbar, onChange]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;
    if (value != null && value !== quill.root.innerHTML) {
      const safe = DOMPurify.sanitize(value, SANITIZE_CONFIG);
      const pos = quill.getSelection();
      quill.clipboard.dangerouslyPasteHTML(safe);
      if (pos) quill.setSelection(pos);
    }
  }, [value]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div ref={containerRef} />
    </div>
  );
}
