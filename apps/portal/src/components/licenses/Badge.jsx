export default function Badge({ children, variant = 'gray' }) {
  const variants = {
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    gray: 'badge-gray',
    primary: 'bg-primary-100 text-primary-800'
  }

  return (
    <span className={`badge ${variants[variant]}`}>
      {children}
    </span>
  )
}
