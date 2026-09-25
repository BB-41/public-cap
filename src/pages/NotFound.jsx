import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page-wrap">
      <p className="kicker">Public Cap</p>
      <h1>This page is not on the desk.</h1>
      <p className="lede">
        Public Cap covers Power 4 football and men’s basketball, plus Notre Dame.
        That address is not a school or a desk page.
      </p>
      <p>
        <Link to="/">Back to the rank list</Link>
      </p>
    </div>
  )
}
