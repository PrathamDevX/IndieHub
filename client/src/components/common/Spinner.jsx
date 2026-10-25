import { LoaderCircle } from 'lucide-react'

export function Spinner({ size = 24, text = 'Loading...' }) {
  return (
    <div className="catalog-loading">
      <LoaderCircle className="spin" size={size} />
      {text ? <span>{text}</span> : null}
    </div>
  )
}

export default Spinner
