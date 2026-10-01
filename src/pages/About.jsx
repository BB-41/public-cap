import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div className="page-wrap about">
      <h1 className="issue-hed">About Public Cap.</h1>
      <p className="lede">
        Cap is the House ceiling everyone cites. Public cap is the real lid: what alumni, TV, tickets, and boosters visibly put in, as shown in public filings.
      </p>
      <p>
        The House cap is the costume. The public one is the checkbook. It is also a pun: this desk works from public records.
      </p>

      <h2>What the desk does</h2>
      <p>
        Public Cap is a college football money desk for 68 schools. It covers House revenue share, annual capacity, coach pay and buyouts, guarantee games, booked NIL, and the Checkbook Bowl.
      </p>
      <p>What can your team actually afford?</p>

      <h2>How we source</h2>
      <p>
        Public records, school filings, FOIA and open-records responses, and cited reporting. Pending stays empty. We do not guess a number to fill a cell. The full rules are on <Link to="/methods">Methods</Link>.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="https://x.com/thePublicCap" target="_blank" rel="noreferrer">@thePublicCap</a> on X.
      </p>
    </div>
  )
}
