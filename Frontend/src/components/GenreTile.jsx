import React from 'react'

export default function GenreTile({ id, name, gradient, active, onSelect }) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`
        relative aspect-square rounded-2xl overflow-hidden
        flex items-center justify-center text-white font-semibold
        shadow-md transition-all duration-300
        ${gradient}
        ${active ? 'ring-4 ring-indigo-400 scale-105' : 'opacity-90 hover:opacity-100 hover:-translate-y-1'}
      `}
    >
      {/* subtle overlay for readability */}
      <span className="absolute inset-0 bg-black/20 mix-blend-multiply"></span>
      <span className="relative z-10">{name}</span>
    </button>
  )
}
