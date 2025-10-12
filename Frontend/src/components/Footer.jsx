export default function Footer() {
  return (
    <footer className="bg-white shadow-inner mt-8">
      <div className="max-w-6xl mx-auto text-center py-6 text-gray-500 text-sm">
        © {new Date().getFullYear()} Deductive. All rights reserved.
      </div>
    </footer>
  )
}
