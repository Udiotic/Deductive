export default function Button({ children, onClick, variant = "primary" }) {
  const base = "px-6 py-3 rounded-full font-semibold transition-transform hover:scale-105 shadow-lg cursor-pointer"
  const styles = {
    primary: `${base} bg-indigo-600 text-white hover:bg-indigo-700`,
    secondary: `${base} bg-white text-indigo-600 border border-indigo-600 hover:bg-indigo-50`,
  }

  return <button className={styles[variant]} onClick={onClick}>{children}</button>
}
