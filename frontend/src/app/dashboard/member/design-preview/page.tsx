"use client";
import Link from "next/link";

const designs = [
  {
    id: 1,
    name: "Glassmorphism Dark",
    desc: "Dark deep-space background with frosted glass cards, violet/cyan gradients, and glowing accents.",
    preview: "bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]",
    accent: "text-violet-300",
  },
  {
    id: 2,
    name: "Ultra Minimal",
    desc: "Pure white canvas, generous spacing, hairline borders, and a single indigo accent. Feels like Notion meets Linear.",
    preview: "bg-white border border-gray-200",
    accent: "text-indigo-600",
  },
  {
    id: 3,
    name: "Bold Gradient",
    desc: "Vibrant top-to-bottom gradient hero, large bold typography, and punchy colorful status badges.",
    preview: "bg-gradient-to-br from-rose-500 via-orange-400 to-yellow-300",
    accent: "text-white",
  },
  {
    id: 4,
    name: "Neo-Brutalist",
    desc: "Thick black borders, hard offset drop-shadows, monochrome palette with a yellow/lime punch.",
    preview: "bg-yellow-300 border-4 border-black",
    accent: "text-black font-black",
  },
  {
    id: 5,
    name: "Soft Pastel",
    desc: "Airy pastel gradients, fully rounded cards, soft layered shadows. Warm and approachable.",
    preview: "bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100",
    accent: "text-purple-600",
  },
];

export default function DesignPreviewIndex() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">UI Design Previews</h1>
          <p className="text-gray-500">
            5 different design directions for the Member page. Click a card to open the full preview.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {designs.map((d) => (
            <Link
              key={d.id}
              href={`/dashboard/member/design-preview/${d.id}`}
              className="group rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            >
              {/* Color swatch preview */}
              <div className={`h-28 w-full ${d.preview}`} />
              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    Style {d.id}
                  </span>
                  <span className="text-xs text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open →
                  </span>
                </div>
                <h2 className="font-bold text-gray-900">{d.name}</h2>
                <p className="text-xs text-gray-500 leading-relaxed">{d.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400">
          All previews use mock data. Navigate to each to see the full member page layout.
        </p>
      </div>
    </div>
  );
}
